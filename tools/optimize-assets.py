#!/usr/bin/env python3
"""Generate/verify lossless production assets. Originals remain untouched.
Authoring only: pip install -r tools/requirements-assets.txt
Use --write to encode; otherwise verify the existing files and refresh the manifest.
"""
from pathlib import Path
from io import StringIO
import argparse,hashlib,json
import PIL,fontTools
from PIL import Image
from fontTools.ttLib import TTFont,woff2
from fontTools.misc.xmlWriter import XMLWriter
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args()
sha=lambda data:hashlib.sha256(data).hexdigest()
def entry(src,out):
 return {'source':str(src.relative_to(ROOT)),'production':str(out.relative_to(ROOT)),
 'sourceBytes':src.stat().st_size,'productionBytes':out.stat().st_size,
 'sourceSha256':sha(src.read_bytes()),'productionSha256':sha(out.read_bytes())}
def glyph_xml(font):
 out=StringIO();font['glyf'].toXML(XMLWriter(out),font);return out.getvalue().encode()
report={'versions':{'Pillow':PIL.__version__,'fontTools':fontTools.__version__},'atlases':[],'fonts':[]}
for stem in ['farm-painted-v1','crops-painted-v2','props-painted-v1','terrain-painted-v1']:
 src=ROOT/'assets'/(stem+'.png');out=src.with_suffix('.webp')
 with Image.open(src) as original:
  if args.write:
   original.save(out,'WEBP',lossless=True,quality=100,method=6,exact=True,alpha_quality=100,icc_profile=original.info.get('icc_profile'))
  with Image.open(out) as decoded:
   assert original.size==decoded.size,f'{stem}: dimensions changed'
   a=original.convert('RGBA').tobytes();b=decoded.convert('RGBA').tobytes()
   assert a==b,f'{stem}: decoded RGBA differs (including transparent RGB)'
   assert original.info.get('icc_profile')==decoded.info.get('icc_profile'),f'{stem}: ICC profile changed'
   e=entry(src,out);e.update(width=original.width,height=original.height,rgbaSha256=sha(a),pixelIdentical=True,iccProfileUnchanged=True);report['atlases'].append(e)
 print(f'PASS {stem}: every RGBA byte identical, {e["sourceBytes"]} → {e["productionBytes"]} bytes',flush=True)
for src in sorted((ROOT/'assets/fonts').glob('*.ttf')):
 out=src.with_suffix('.woff2')
 if args.write:woff2.compress(src,out)
 with TTFont(src,recalcBBoxes=False,recalcTimestamp=False) as a,TTFont(out,recalcBBoxes=False,recalcTimestamp=False) as b:
  assert set(a.reader.keys())==set(b.reader.keys()),f'{src.name}: font tables changed'
  assert a.getGlyphOrder()==b.getGlyphOrder(),f'{src.name}: glyph order changed'
  assert a.getBestCmap()==b.getBestCmap(),f'{src.name}: character coverage changed'
  assert a['hmtx'].metrics==b['hmtx'].metrics,f'{src.name}: metrics changed'
  x,y=glyph_xml(a),glyph_xml(b);assert x==y,f'{src.name}: outlines/instructions changed'
  for tag in a.reader.keys():
   if tag not in ('glyf','loca','head'):assert a.reader[tag]==b.reader[tag],f'{src.name}: {tag} data changed'
  # WOFF2 requires head.flags bit 11 and a new checksum; neither changes rendering.
  assert a['head'].flags|0x800==b['head'].flags
  for k,v in vars(a['head']).items():
   if k not in ('checkSumAdjustment','flags'):assert v==getattr(b['head'],k),f'{src.name}: head.{k} changed'
  e=entry(src,out);e.update(glyphCount=len(a.getGlyphOrder()),characterCount=len(a.getBestCmap()),glyphXmlSha256=sha(x),outlinesAndHintsIdentical=True,metricsAndCoverageIdentical=True,otherFontTablesIdentical=True);report['fonts'].append(e)
 print(f'PASS {src.name}: all glyphs, metrics, hints and shaping retained, {e["sourceBytes"]} → {e["productionBytes"]} bytes',flush=True)
(ROOT/'assets/optimized-assets.json').write_text(json.dumps(report,indent=2)+'\n')
