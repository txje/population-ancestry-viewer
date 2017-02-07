
from CGIHTTPServer import CGIHTTPRequestHandler
import BaseHTTPServer
import sys

CGIHTTPRequestHandler.cgi_directories = ['/services']

def run(port):
    httpd = BaseHTTPServer.HTTPServer(('',port), CGIHTTPRequestHandler)
    httpd.serve_forever()

if __name__ == '__main__':
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
