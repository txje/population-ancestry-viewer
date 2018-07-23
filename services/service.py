#!/usr/bin/env python

# ------------------------------------------------
# Copyright 2010-2017
# Jeremy R. Wang
#
# JsonRPC CGI request handler
# Service class handles requests for data
# Chromosome and samples are filtered here after the data is read,
#   the positions are filtered on the client
# ------------------------------------------------

import os
import time
import pysam
import json
import cgi


# returns a list of (sample, filename)
def make_filenames(templates, samples, chrom, sample_meta):
  template = templates["*"] # this is the only mode supported right now, with one file template per track
  if "<chrom>" in template:
    template = template.replace("<chrom>", chrom)
  if "<sample>" in template:
    if "<set>" in template:
      return [(s, template.replace("<sample>", s).replace("<set>", sample_meta[s]["set"])) for s in samples]
    else:
      return [(s, template.replace("<sample>", s)) for s in samples]
  else:
    return [("*", template)]

def filter_bed(samples, chrom, start_pos, end_pos, data_dir, meta, sample_meta):
    data = {}
    for s,f in make_filenames(meta["files"], samples, chrom, sample_meta):
      tbx = pysam.TabixFile("%s/%s" % (data_dir, f))
      data[s] = [row.split('\t')[1:4] for row in tbx.fetch(chrom, start_pos, end_pos)] # return only (start, end, name) [0] is chrom, 4+ are other data, if any
    return data

def filter_vcf(samples, chrom, start_pos, end_pos, data_dir, meta, sample_meta):
    data = {}
    for s,f in make_filenames(meta["files"], samples, chrom, sample_meta):
      fname = "%s/%s" % (data_dir, f)
      tbx = pysam.TabixFile(fname)

      # filter VCF for chosen samples
      # header should look like "#CHROM POS ID  REF ALT QUAL    FILTER  INFO    FORMAT  HG00096 HG00100 ..."
      for hdr in tbx.header:
        if hdr[1] != '#': # the column header line, also probably the last header line
          fields = hdr[1:].split('\t')
          # the client should check if the set of returned samples matches what was expected, otherwise the samples listed in the VCF don't match what was requested
          sample_indices = [fields.index(a) for a in samples if a in fields]
          break

      rows = [row.split('\t') for row in tbx.fetch(chrom, start_pos, end_pos)]
      call_format = rows[0][8]
      gt_part = call_format.split(':').index('GT')
      # genotypes will be in the form "0|0", "0/0", "./.", or the like. '|' indicates phased, '/' unphased
      data[s] = [row[:9] + [row[r].split(':')[gt_part] for r in sample_indices] for row in [fields]+rows]
    return data

def get_tracks(samples, chrom, tracks, bounds=[None, None], json_fmt=True):
    if os.path.exists("services"):
      data_dir = "services/data/" # dev
    else:
      data_dir = "data/" # production

    meta = json.load(open("meta.json"))
    track_meta = {}
    for t in meta["tracks"]:
      track_meta[t["name"]] = t

    sample_meta = {}
    for s in meta["samples"]:
      sample_meta[s["name"]] = s

    return_tracks = {}
    for t in tracks:
      data = None
      if track_meta[t]["maximum_resolution"] <= 0 or track_meta[t]["maximum_resolution"] > (bounds[1] - bounds[0]):
        if track_meta[t]["type"] == "vcf":
          data = filter_vcf(samples, chrom, bounds[0], bounds[1], data_dir, track_meta[t], sample_meta)
          if not json_fmt:
            #out = "CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	" + "\t".join(samples) + "\n" + "\n".join(['\t'.join(d) for s in data for d in data[s]])
            out = "\n".join(['\t'.join(d) for s in data for d in data[s]])
            return out
        elif track_meta[t]["type"] == "bed":
          data = filter_bed(samples, chrom, bounds[0], bounds[1], data_dir, track_meta[t], sample_meta)
          if not json_fmt:
            out = "sample	start	end	name\n" + "\n".join(['\t'.join([s] + d) for s in data for d in data[s]])
            return out
      return_tracks[t] = data

    return return_tracks

if __name__ == '__main__':
  # log user access
  #addy = os.environ["REMOTE_ADDR"]
  #now = time.strftime("%H:%M:%S %m/%d/%Y")
  #fout = open("log/users.log", 'a')
  #fout.write(str(addy) + "," + str(now) + "\n")
  #fout.close()

  import cgitb
  cgitb.enable()

  form = cgi.FieldStorage()

  name = form.getvalue('name')
  chrom = form.getvalue('chrom')
  start = int(form.getvalue('start'))
  end = int(form.getvalue('end'))
  fmt = form.getvalue('format')
  if "strain" in form:
    strains = form.getvalue('strain')
    if type(strains) != type([]):
      strains = [strains]
  else:
    strains = None
  if fmt == "text":
    print "Content-type: text/plain\n"
    response = get_tracks(strains, chrom, [name], [start, end], json_fmt=False)
    print response
  else: # elif fmt == "json"
    print "Content-type: text/json\n"
    response = get_tracks(strains, chrom, [name], [start, end], json_fmt=True)
    print json.dumps(response)
