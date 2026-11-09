#!/usr/bin/env python3
"""Verify embedded sprite bounds against the original PNG alpha (production WebP pixels are separately verified), using only Python stdlib.
Run from the project root: python3 tools/check-atlas-metadata.py
"""
from pathlib import Path
import struct,zlib
import math,json,difflib
source=Path('index.html').read_text()
meta={}
for name,cols,rows,opaque in [('farm-painted-v1.png',3,2,False),('crops-painted-v2.png',4,2,False),('props-painted-v1.png',4,3,False),('terrain-painted-v1.png',2,2,True)]:
 raw=(Path('assets')/name).read_bytes();width,height,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',raw[16:29]);assert depth==8 and interlace==0
 rects=[];data=b'';pos=8
 while pos<len(raw):
  length=struct.unpack('>I',raw[pos:pos+4])[0];kind=raw[pos+4:pos+8]
  if kind==b'IDAT':data+=raw[pos+8:pos+8+length]
  pos+=length+12
 rowsdata=[]
 if not opaque:
  assert color==6
  decoded=zlib.decompress(data);stride=width*4;prev=bytearray(stride);pos=0
  for yy in range(height):
   filt=decoded[pos];row=bytearray(decoded[pos+1:pos+1+stride]);pos+=stride+1
   for i in range(stride):
    left=row[i-4] if i>=4 else 0;up=prev[i];corner=prev[i-4] if i>=4 else 0
    if filt==1: predictor=left
    elif filt==2:predictor=up
    elif filt==3:predictor=(left+up)//2
    elif filt==4:
     pp=left+up-corner;pa=abs(pp-left);pb=abs(pp-up);pc=abs(pp-corner);predictor=left if pa<=pb and pa<=pc else up if pb<=pc else corner
    else:assert filt==0;predictor=0
    row[i]=(row[i]+predictor)&255
   rowsdata.append(row);prev=row
 for n in range(cols*rows):
  col=n%cols;row=n//cols;ox=math.floor(col*width/cols+.5);oy=math.floor(row*height/rows+.5);cw=math.floor((col+1)*width/cols+.5)-ox;ch=math.floor((row+1)*height/rows+.5)-oy
  if opaque:rects.append([ox,oy,cw,ch]);continue
  inset=8 if name.startswith('crops') else 0;l=cw;t=ch;r=0;b=0
  for yy in range(inset,ch-inset):
   rowbytes=rowsdata[oy+yy]
   for xx in range(inset,cw-inset):
    if rowbytes[(ox+xx)*4+3]>32:l=min(l,xx);r=max(r,xx);t=min(t,yy);b=max(b,yy)
  assert r>l and b>t
  l=max(inset,l-2);t=max(inset,t-2);r=min(cw-inset-1,r+2);b=min(ch-inset-1,b+2);rects.append([ox+l,oy+t,r-l+1,b-t+1])
 meta['assets/'+name.replace('.png','.webp')]={'width':width,'height':height,'rects':rects}

import re
embedded=json.loads(re.search(r"const ATLAS_META=(.*);",source).group(1))
assert embedded==meta, 'Atlas alpha bounds changed. Regenerate ATLAS_META before shipping new art.'
print('Passed: all embedded atlas dimensions and alpha bounds match the four pixel-identical production atlases.')
