Population Ancestry Viewer
==========================

A flexible web-based framework for the visualization of collinear genomic features

&copy; 2010-2017 Jeremy Wang

MIT Licensed


Overview
--------

The viewer displays arbitrary collinear genomically-anchored datasets. By collinear,
I mean the data must be annotated on the same version of the same reference genome.

This tool was originally developed to support the analysis of classical laboratory
mice (http://msub.csbio.unc.edu) and the Collaborative Cross
(http://csbio.unc.edu/ccv). These deployments integrate several datasets, including
generic mouse annotation, genotypes, ancestry, and phylogenetic trees.

This generic version currently supports arbitrary VCF and BED annotations. It is
designed to be as light-weight as possible on the server, while fetching requested
data with relative efficiency. The server consists of a python CGI script that uses
tabix to fetch the requested subset of data. A compatible Python with pysam module
and tabix installation are the only server-side requirements - the data need not be
preprocessed other than to index the input VCF and BED files using tabix.

Client-side resources not acquired via CDN and not included in this repo include:
  * https://github.com/harvesthq/chosen
    Version 1.6.2 is known to work and should be downloaded and put in the /incl directory

jQuery and Bootstrap are also used and recent versions are fetched from CDN.

A metadata file (in JSON format) must be constructed for your specific deployment.
The example deployment using the MXL population from the 1000 Genomes project uses
the metadata file below:

    {
      "description": "1000 genomes Phase 1 MXL population chromosomes 21 and 22.<br/>
                      Coordinates are on NCBI36/hg18.<br/>
                      <br/>
                      <i>An integrated map of genetic variation from 1092 human genomes</i>.
                      Nature 491, 56–65 (01 November 2012) doi:10.1038/nature11632",

      "samples": [
        {"name": "NA19648", "set": "MXL"},
        {"name": "NA19660", "set": "MXL"},
        {"name": "NA19676", "set": "MXL"},
        {"name": "NA19685", "set": "MXL"},
        {"name": "NA19723", "set": "MXL"},
        ...
       ],

      "chromosomes": [
        {"name": "21", "length": 46944323, "display": "21 (47 Mbp)"},
        {"name": "22", "length": 49691432, "display": "22 (50 Mbp)"}
      ],

      "tracks": [
        {
          "name": "Integrated variants",
          "maximum_resolution": 1000000,
          "files": {
            "*": "ALL.chr<chrom>.integrated_phase1_v3.20101123.snps_indels_svs.genotypes.vcf.gz"
          },
          "colors": {
            "REF": [200,200,200,1],
            "HET": [200,100,0,1],
            "ALT": [200,0,0,1]
          },
          "type": "vcf"
        },
        {
          "name": "Ancestry deconvolution",
          "maximum_resolution": 0,
          "files": {
            "*": "<set>/<sample>.bed.gz"
          },
          "colors": {
            "undet": [200,200,200,1],
            "0": [0,0,0,1],
            "1": [200,0,0,1],
            "2": [0,200,0,1],
            "3": [0,0,200,1],
            "4": [200,200,0,1],
            "5": [200,0,200,1],
            "6": [0,200,200,1]
          },
          "type": "bed"
        }
      ]
    }


The data for this demo version use chromsomes 21 and 22 from the MXL population in the 1000 Genomes project:

  * ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase1/analysis_results/ancestry_deconvolution/MXL_phase1_ancestry_deconvolution.zip
  * ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase1/analysis_results/integrated_call_sets/ALL.chr21.integrated_phase1_v3.20101123.snps_indels_svs.genotypes.vcf.gz
  * ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase1/analysis_results/integrated_call_sets/ALL.chr22.integrated_phase1_v3.20101123.snps_indels_svs.genotypes.vcf.gz
  

The following should work to install and run the demo on a \*nix platform with Python 2.7+, pysam, and tabix installed:

    git clone https://github.com/txje/population-ancestry-viewer
    cd population-ancestry-viewer
    mkdir incl
    cd incl
    wget https://github.com/harvesthq/chosen/releases/download/v1.6.2/chosen_v1.6.2.zip
    unzip chosen_v1.6.2.zip
    mv chosen_v1.6.2 chosen
    cd ..
    mkdir services/data
    cd services/data/
    wget ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase1/analysis_results/ancestry_deconvolution/MXL_phase1_ancestry_deconvolution.zip
    unzip MXL_phase1_ancestry_deconvolution.zip
    bgzip MXL/*.bed
    tabix MXL/*.gz
    wget ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase1/analysis_results/integrated_call_sets/ALL.chr21.integrated_phase1_v3.20101123.snps_indels_svs.genotypes.vcf.gz
    wget ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase1/analysis_results/integrated_call_sets/ALL.chr22.integrated_phase1_v3.20101123.snps_indels_svs.genotypes.vcf.gz
    tabix *.gz
    cd ../..
    python PythonCGIServer.py 80

Then visit http://localhost

To deploy the viewer under a real web server (say, nginx or Apache), the /services directory should be marked
to execute CGI.


For more details see:

JR Wang. *Population Ancestry Viewer: Ancestry visualization in admixed populations*. Submitted.
