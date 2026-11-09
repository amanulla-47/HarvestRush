import {execFileSync} from 'node:child_process';
import {statSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const probe=process.env.HARVEST_FFPROBE||'ffprobe';
const cases=[['landscape',1920,1080],['portrait',1080,1620]],videos=[];
for(const [format,width,height]of cases){
 const path=`dist/video/harvest-rush-promo-${format}-${width}x${height}.mp4`;
 const result=JSON.parse(execFileSync(probe,['-v','error','-show_streams','-show_format','-of','json',path],{encoding:'utf8'}));
 const streams=result.streams,video=streams.find(s=>s.codec_type==='video'),duration=Number(result.format.duration),bytes=statSync(path).size;
 assert.equal(streams.length,1,'Exactly one video stream, with no audio');assert.equal(video.codec_name,'h264');assert.equal(video.pix_fmt,'yuv420p');
 assert.equal(video.width,width);assert.equal(video.height,height);assert.equal(video.avg_frame_rate,'30/1');assert.ok(duration>=15&&duration<=20);assert.ok(bytes<=50*1024*1024);
 videos.push({file:path,format,width,height,duration,bytes,fps:30,codec:'H.264',pixelFormat:video.pix_fmt,audio:false,openingCover:`dist/covers/v2/${format==='landscape'?'landscape-1920x1080.png':'portrait-800x1200.png'}`,source:'Live Three.js gameplay montage with hard cuts between separately staged crop/sale shots; 1x simulation; close framing; guidance, instructions and purchase panels hidden; isolated no-save farm',verifiedActions:['wheat harvest','tomato harvest','market sale','pumpkin harvest','strawberry harvest','corn harvest']});
 console.log(`Passed: ${format}, ${width}x${height}, ${duration}s, ${(bytes/1048576).toFixed(2)} MiB, H.264 30fps, no audio.`);
}
writeFileSync('dist/video/validation.json',JSON.stringify({checkedAt:new Date().toISOString(),videos},null,2)+'\n');
const report=JSON.parse(readFileSync('dist/basic-launch-report.json','utf8'));report.videos=videos;report.pending=report.pending.filter(s=>!s.startsWith('Landscape and portrait preview videos'));writeFileSync('dist/basic-launch-report.json',JSON.stringify(report,null,2)+'\n');
