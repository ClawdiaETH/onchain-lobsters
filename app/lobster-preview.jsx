import { useState, useRef, useEffect } from "react";

const W = 40, H = 52;

// ─── Color utils ─────────────────────────────────────────────────────────────
const h2r = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const mix = (a, b, t) => [0,1,2].map(i => Math.round(a[i]*(1-t)+b[i]*t));
const dk = (c, t) => mix(c, [0,0,0], t);
const lt = (c, t) => mix(c, [255,255,255], t);

// ─── Pixel ops ───────────────────────────────────────────────────────────────
function sp(b, x, y, c) {
  if (x<0||x>=W||y<0||y>=H||!c) return;
  const i=(y*W+x)*4; b[i]=c[0]; b[i+1]=c[1]; b[i+2]=c[2]; b[i+3]=255;
}
function fr(b,x1,y1,x2,y2,c){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)sp(b,x,y,c);}
function ln(b,x0,y0,x1,y1,c){
  let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
  for(;;){sp(b,x0,y0,c);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
}
function ov(b,cx,cy,rx,ry,fn){
  for(let y=Math.floor(cy-ry-1);y<=Math.ceil(cy+ry+1);y++){
    const dy=(y+.5-cy)/(ry+.5); if(Math.abs(dy)>1)continue;
    const mw=(rx+.5)*Math.sqrt(1-dy*dy);
    for(let x=Math.floor(cx-mw);x<=Math.floor(cx+mw);x++){const c=fn((x+.5-cx)/(rx+.5),dy,x,y);if(c)sp(b,x,y,c);}
  }
}
const nv=(x,y,s=1)=>Math.abs((Math.sin(x*127.1*s+y*311.7*s)*43758.5453)%1);

// ─── Traits ───────────────────────────────────────────────────────────────────
const MUTATIONS=[
  {name:"Classic Red",   b:"#C84820",s:"#7A2C10",h:"#E8784A"},
  {name:"Ocean Blue",    b:"#1A4E8C",s:"#0C2E58",h:"#4A80BC"},
  {name:"Melanistic",    b:"#1E1E2A",s:"#0C0C14",h:"#383850"},
  {name:"Albino",        b:"#E4D8C0",s:"#B8A888",h:"#F4EEE4"},
  {name:"Yellow",        b:"#C8A014",s:"#7A5E08",h:"#E8C840"},
  {name:"Calico",        b:"#C84820",s:"#7A2C10",h:"#E8784A",b2:"#1A4E8C",s2:"#0C2E58"},
  {name:"Cotton Candy",  b:"#E090B4",s:"#B86090",h:"#F4B4CC",b2:"#88B4E8",s2:"#6090C8"},
  {name:"Burnt Sienna",  b:"#8A3A18",s:"#4A1C08",h:"#AA5428"},
];
const SCENES=[
  {name:"Open Water",   fl:"#0A1828",f2:"#0D2038",grain:false,type:"bubbles"},
  {name:"Kelp Forest",  fl:"#071410",f2:"#0A1E14",grain:false,type:"kelp"},
  {name:"Coral Reef",   fl:"#0C0614",f2:"#160824",grain:false,type:"coral"},
  {name:"Volcanic Vent",fl:"#050202",f2:"#0A0402",grain:false,type:"vent"},
  {name:"Shipwreck",    fl:"#100C06",f2:"#1A1408",grain:true, type:"planks"},
  {name:"Tide Pool",    fl:"#A0784A",f2:"#887040",grain:true, type:"starfish"},
  {name:"Ocean Floor",  fl:"#2A2014",f2:"#1A1408",grain:true, type:"rocks"},
  {name:"The Abyss",    fl:"#000000",f2:"#000000",grain:false,type:"none"},
];
const MARKINGS=["None","Spotted","Striped","Iridescent","Battle Scarred","Banded","Mottled","Chitin Sheen"];
const EYES_LIST=["Standard","Glow Green","Glow Blue","Cyclops","Void","Laser","Noggles"];
const CLAWS_LIST=["Balanced","Left Crusher","Right Crusher","Dueling","Giant Left","Regenerating"];
const ACCESSORIES=["None","Pirate Hat","Crown","Eye Patch","Barnacles","Old Coin","Admiral Hat","Pearl","Rainbow Puke","Gold Chain","Blush"];

// ─── Floor / scene background ────────────────────────────────────────────────
function drawFloor(b, sc) {
  const fl=h2r(sc.fl), f2=h2r(sc.f2);
  // Fill with vignette
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const vx=(x-W/2)/(W/2),vy=(y-H/2)/(H/2);
    const vig=Math.min(1,(vx*vx+vy*vy)*0.45);
    sp(b,x,y,mix(fl,dk(fl,.55),vig));
  }
  switch(sc.type){
    case'bubbles':
      [[3,4],[7,8],[15,3],[28,6],[37,4],[2,18],[36,14],[5,38],[33,42],[38,30],[1,46],[9,26],[24,2],[32,22]].forEach(([x,y])=>{
        const c=lt(f2,.45); sp(b,x,y,c); sp(b,x+1,y,lt(c,.2)); sp(b,x,y-1,lt(c,.15));
      }); break;
    case'kelp':
      [2,6,10,30,35,39].forEach((kx,ki)=>{
        for(let y=0;y<H;y++){
          const wx=Math.round(Math.sin(y*.4+ki*1.3)*1.5);
          sp(b,Math.max(0,Math.min(W-1,kx+wx)),y,nv(kx,y,2)>.6?lt(f2,.12):dk(f2,.1));
          if(y%7===ki%7) for(let f=1;f<=3;f++) sp(b,Math.max(0,Math.min(W-1,kx+wx+(ki%2?-f:f))),y,lt(f2,.07));
        }
      }); break;
    case'coral':{
      const cc=h2r("#8A2010");
      [[4,48,4,10],[8,44,3,8],[36,48,3,9],[33,44,4,10],[18,50,5,5],[22,50,5,5]].forEach(([x,y,rx,h])=>{
        for(let r=y-h;r<=y;r++){const wid=Math.round(rx*Math.sqrt(1-((r-y)/h)**2));for(let cx=x-wid;cx<=x+wid;cx++) sp(b,cx,r,dk(cc,(r-y+h)/h*.5));}
        for(let a=-2;a<=2;a++) sp(b,x+a,y-h-1,lt(cc,.12));
      });
      for(let i=0;i<18;i++){const x=Math.floor(nv(i,0,3)*W),y=Math.floor(nv(i,1,3)*H);if(x>=0&&x<W&&y>=0&&y<H)sp(b,x,y,dk(cc,.5));} break;
    }
    case'vent':{
      const hc=h2r("#7A2408");
      [[20,40],[8,45],[33,42]].forEach(([vx,vy])=>{
        for(let y=vy;y<H;y++){const sp2=Math.round((y-vy)*.5);for(let x=vx-sp2;x<=vx+sp2;x++) sp(b,x,y,mix(fl,hc,(y-vy)/(H-vy)));}
        for(let y=vy-20;y<vy;y++){const dist=vy-y,wx=Math.round(Math.sin(y*.5));if(nv(vx,y,5)>.55) sp(b,vx+wx,y,mix(fl,hc,Math.max(0,.4-dist*.015)));if(nv(vx+1,y,6)>.65) sp(b,vx+wx+1,y,mix(fl,hc,Math.max(0,.25-dist*.01)));}
      }); break;
    }
    case'planks':{
      const pl=h2r("#3A2808"),nail=h2r("#181410");
      [[5,30,36,31],[3,36,32,37],[10,42,38,43],[0,14,22,15],[18,6,39,7]].forEach(([x1,y1,x2,y2])=>{
        for(let x=x1;x<=x2;x++){sp(b,x,y1,mix(pl,dk(pl,.3),nv(x,y1,7)*.4));sp(b,x,y2,dk(pl,.2));}
        sp(b,x1+2,y1,nail);sp(b,x2-2,y1,nail);
      });
      for(let i=0;i<25;i++){const x=Math.floor(nv(i,0,9)*W),y=Math.floor(nv(i,1,9)*H);if(x>=0&&x<W&&y>=0&&y<H)sp(b,x,y,dk(pl,.4));} break;
    }
    case'starfish':
      for(let y=0;y<H;y++) for(let x=0;x<W;x++) sp(b,x,y,mix(fl,f2,nv(x,y,11)*.4));
      [[5,47],[34,44]].forEach(([sx,sy])=>{
        const sf=h2r("#D04018");
        sp(b,sx,sy,sf);sp(b,sx+1,sy,sf);sp(b,sx-1,sy,sf);sp(b,sx,sy-1,sf);sp(b,sx,sy+1,sf);sp(b,sx+2,sy+1,dk(sf,.3));
      });
      [[10,49],[28,47],[15,3],[35,8]].forEach(([x,y])=>{sp(b,x,y,lt(fl,.3));sp(b,x+1,y,lt(fl,.2));}); break;
    case'rocks':
      for(let y=0;y<H;y++) for(let x=0;x<W;x++) sp(b,x,y,mix(fl,f2,nv(x,y,13)*.38));
      [[5,48,4,2],[16,50,5,2],[35,47,4,2],[3,8,3,2],[37,10,4,2],[22,4,3,1]].forEach(([cx,cy,rx,ry])=>{
        ov(b,cx,cy,rx,ry,(_,ny,x,y)=>mix(f2,dk(f2,.4),Math.abs(ny)*.6+.1));
      });
      [10,22,34,46].forEach(ry=>{for(let x=0;x<W;x++) sp(b,x,ry,lt(fl,.04));}); break;
    default: break;
  }
  if(sc.grain) for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(nv(x,y,17)>.72){const i=(y*W+x)*4;b[i]=Math.min(255,b[i]+18);b[i+1]=Math.min(255,b[i+1]+14);b[i+2]=Math.min(255,b[i+2]+8);}
  }
}

// ─── Pincer claw renderer ─────────────────────────────────────────────────────
// Top-down lobster: body faces UP. Claws extend up-and-outward from front of head.
// Each claw: cheliped arm → palm → two fingers pointing TOWARD TOP OF CANVAS.
// Gap between fingers is vertical (runs up-down), fingers are left and right of gap.
//
// Layout for LEFT claw (mirror for right):
//
//   [innerFinger][gap][outerFinger]   ← finger tips, pointing up (low y)
//       [  palm block  ]
//           [arm]
//         [cheliped]
//
function drawClaw(b, side, scale, shell) {
  const isR = side === 'right';

  // Palm center position — up and outward from the head
  // Left claw: upper-left area.  Right claw: upper-right area.
  const palmCX = isR ? 29 : 10;
  const palmCY = 10;                          // near top of canvas

  // Palm dimensions: wider than tall (horizontal block)
  const palmW = Math.max(5, Math.round(6 * scale));  // horizontal extent
  const palmH = Math.max(2, Math.round(2 * scale));  // vertical thickness
  const px1 = palmCX - Math.floor(palmW / 2);
  const px2 = palmCX + Math.floor(palmW / 2);
  const py1 = palmCY - Math.floor(palmH / 2);
  const py2 = palmCY + Math.floor(palmH / 2);

  // ARM: from cheliped junction up to palm bottom
  // Cheliped exits head at roughly (isR?25:14), y=16
  const armSX = isR ? 25 : 14, armSY = 16;
  ln(b, armSX, armSY, palmCX, py2 + 1, shell(palmCX, 's'));
  ln(b, armSX, armSY - 1, palmCX, py2, shell(palmCX, ''));

  // PALM block
  for(let y = py1; y <= py2; y++)
    for(let x = px1; x <= px2; x++)
      sp(b, x, y, shell(x, y === py1 ? 'h' : y === py2 ? 's' : ''));

  // FINGERS extend UPWARD from palm top (py1).
  // Gap runs vertically at palmCX — divides palm into inner (body-side) and outer finger.
  // For RIGHT claw: inner finger is LEFT of gap (closer to body center).
  // For LEFT claw:  inner finger is RIGHT of gap (closer to body center).
  const gapX     = palmCX;
  const fingerLen = Math.max(4, Math.round(6 * scale));

  // Inner finger: the finger closest to body center
  // Outer finger: the finger away from body center
  // For right claw: inner=left half (px1..gapX-1), outer=right half (gapX+1..px2)
  // For left claw:  inner=right half (gapX+1..px2),  outer=left half (px1..gapX-1)
  const innerX1 = isR ? px1       : gapX + 1;
  const innerX2 = isR ? gapX - 1  : px2;
  const outerX1 = isR ? gapX + 1  : px1;
  const outerX2 = isR ? px2       : gapX - 1;

  const drawFinger = (fx1, fx2, taperSide) => {
    // taperSide: 'inner' means outer edge tapers, 'outer' means inner edge tapers
    const baseW = fx2 - fx1 + 1;
    for(let step = 0; step <= fingerLen; step++){
      const fy = py1 - 1 - step;
      if(fy < 0) break;
      const taper = Math.max(1, Math.round(baseW * (1 - step / (fingerLen + 0.5))));
      let lx, rx;
      if(taperSide === 'inner'){
        // outer edge fixed, inner edge moves outward (toward gap stays fixed)
        lx = fx1; rx = fx1 + taper - 1;
      } else {
        lx = fx2 - taper + 1; rx = fx2;
      }
      for(let x = lx; x <= rx; x++){
        const tip = step >= fingerLen - 1;
        const top = step === 0;
        sp(b, x, fy, shell(x, tip ? 'd' : top ? 'h' : x === lx || x === rx ? 'd' : ''));
      }
    }
  };

  // Draw both fingers
  drawFinger(innerX1, innerX2, isR ? 'inner' : 'outer');
  drawFinger(outerX1, outerX2, isR ? 'outer' : 'inner');

  // Gap: dark channel between the two fingers
  for(let step = 0; step <= fingerLen; step++){
    const fy = py1 - 1 - step;
    if(fy < 0) break;
    sp(b, gapX, fy, dk(shell(gapX, 's'), 0.6));
  }

  // Knuckle highlights at base of fingers
  sp(b, px1, py1, shell(px1, 'h'));
  sp(b, px2, py1, shell(px2, 'h'));
  sp(b, gapX, py1, dk(shell(gapX, ''), 0.15));
}

// ─── Main render ──────────────────────────────────────────────────────────────
function renderLobster(t) {
  const buf = new Uint8ClampedArray(W*H*4);
  const mut = MUTATIONS[t.mutation]||MUTATIONS[0];
  const sc  = SCENES[t.scene]||SCENES[0];
  const isCalico = t.mutation===5||t.mutation===6;
  const B=h2r(mut.b),S=h2r(mut.s),H2=h2r(mut.h);
  const B2=mut.b2?h2r(mut.b2):B, S2=mut.s2?h2r(mut.s2):S;

  const shell=(x,zone)=>{
    const left=!isCalico||x<20;
    const base=left?B:B2, shad=left?S:S2;
    if(zone==='h') return lt(base,.28);
    if(zone==='s') return dk(base,.28);
    if(zone==='d') return dk(base,.14);
    return base;
  };

  // 1. FLOOR
  drawFloor(buf, sc);

  // Body shadow on floor (top-down light = shadow directly underneath)
  for(let y=17;y<=49;y++) for(let x=10;x<=29;x++){
    const dx=(x-19.5)/10,dy=(y-33)/17;
    if(dx*dx+dy*dy<1.0){const i=(y*W+x)*4;buf[i]=Math.max(0,buf[i]-20);buf[i+1]=Math.max(0,buf[i+1]-20);buf[i+2]=Math.max(0,buf[i+2]-20);}
  }

  // 2. LEGS (behind body)
  const legC=dk(shell(15,'s'),.08);
  [[12,24,3,18],[12,27,1,24],[12,30,1,30],[12,33,3,36]].forEach(([x0,y0,x1,y1])=>ln(buf,x0,y0,x1,y1,legC));
  [[27,24,36,18],[27,27,38,24],[27,30,38,30],[27,33,36,36]].forEach(([x0,y0,x1,y1])=>ln(buf,x0,y0,x1,y1,legC));

  // 3. TAIL FAN
  const fanSpread=t.tailVariant===1?2:0;
  [[10-fanSpread,51],[15,51],[20,52],[25,51],[30+fanSpread,51]].forEach(([cx,cy])=>{
    ov(buf,cx,cy,3,2,(_,ny,x)=>shell(x,ny>0?'s':''));
  });
  fr(buf,17,49,22,50,shell(20,'s'));

  // 4. ABDOMEN SEGMENTS
  for(let i=0;i<5;i++){
    const y=33+i*4, x1=15+i, x2=24-i;
    for(let row=y;row<=y+3;row++) for(let x=x1;x<=x2;x++) sp(buf,x,row,shell(x,row===y?'h':row===y+3?'s':''));
    if(i<4) for(let x=x1;x<=x2;x++) sp(buf,x,y+4,dk(shell(x,''),.22));
    sp(buf,x1,y+1,dk(shell(x1,''),.18));sp(buf,x2,y+1,dk(shell(x2,''),.18));
  }

  // 5. CARAPACE
  ov(buf,20,25,10,8,(nx,ny,x)=>{
    if(ny<-.5) return shell(x,'h');
    if(ny>.45) return shell(x,'s');
    if(Math.abs(nx)>.8) return shell(x,'d');
    return shell(x,'');
  });
  for(let y=18;y<=32;y++) sp(buf,20,y,dk(shell(20,''),.12));
  for(let x=15;x<=24;x++) sp(buf,x,32,dk(shell(x,''),.2));

  // 6. HEAD
  ov(buf,20,18,6,4,(nx,ny,x)=>{
    if(ny<-.4) return shell(x,'h');
    if(ny>.3) return shell(x,'s');
    return shell(x,'');
  });
  // Rostrum
  [[20,13,''],[19,14,''],[20,14,'h'],[21,14,''],[19,15,''],[20,15,'h'],[21,15,''],[20,12,'h']].forEach(([x,y,z])=>sp(buf,x,y,shell(x,z)));

  // 7. CHELIPEDS — broad arm segments connecting head to claw palms
  // Left: from head-left (x=14,y=17) up-left to claw area
  fr(buf, 12, 15, 15, 19, shell(13, ''));
  for(let y=15;y<=19;y++) sp(buf,12,y,shell(12,'s')), sp(buf,15,y,shell(15,'s')), sp(buf,13,y,shell(13,y===15?'h':''));
  // Right cheliped
  fr(buf, 24, 15, 27, 19, shell(26, ''));
  for(let y=15;y<=19;y++) sp(buf,27,y,shell(27,'s')), sp(buf,24,y,shell(24,'s')), sp(buf,26,y,shell(26,y===15?'h':''));

  // 8. PINCER CLAWS
  const scaleMap={left:[1,1.5,0.7,0.9,2.0,0.5],right:[1,0.7,1.5,0.9,0.8,1.0]};
  drawClaw(buf,'left', scaleMap.left[t.claws||0],  shell);
  drawClaw(buf,'right',scaleMap.right[t.claws||0], shell);

  // 9. MARKINGS
  const irid=lt(B,.5), mkC=dk(shell(20,'s'),.18);
  switch(t.marking){
    case 1:[[17,22],[21,25],[23,21],[16,28],[24,26],[19,21],[20,29]].forEach(([x,y])=>sp(buf,x,y,mkC));break;
    case 2:[22,26,30].forEach(sy=>{for(let x=12;x<=28;x++){const dx=(x-20)/10,dy=(sy-25)/9;if(dx*dx+dy*dy<1)sp(buf,x,sy,mkC);}});break;
    case 3:for(let i=0;i<16;i++){const x=11+i,y=20+Math.floor(i*.6);sp(buf,x,y,mix(shell(x,''),irid,.55));}break;
    case 4:[[15,22],[16,23],[15,23],[16,22]].forEach(([x,y])=>sp(buf,x,y,dk(S,.5)));[[24,27],[25,26],[25,28],[26,27]].forEach(([x,y])=>sp(buf,x,y,dk(S,.5)));break;
    case 5:for(let i=0;i<5;i++){const y=33+i*4,x1=15+i,x2=24-i;for(let x=x1;x<=x2;x++) sp(buf,x,y,mkC);}break;
    case 6:[[16,21],[20,23],[23,21],[15,27],[22,28],[18,25],[24,25]].forEach(([x,y])=>{sp(buf,x,y,mkC);sp(buf,x+1,y,mkC);sp(buf,x,y+1,mkC);});break;
    case 7:for(let y=19;y<=31;y++) for(let x=11;x<=28;x++){if((x+y)%2===0){const dx=(x-20)/10,dy=(y-25)/9;if(dx*dx+dy*dy<1)sp(buf,x,y,mix(shell(x,''),irid,.38));}}break;
  }

  // 10. ANTENNAE
  const antC=dk(shell(20,'s'),.1);
  ln(buf,18,14,t.brokenAntenna?12:6,t.brokenAntenna?8:0,antC);
  ln(buf,22,14,31,0,antC);

  // 11. EYES
  const EG=h2r("#30E060"),EB=h2r("#2878F0"),VOID=[4,4,4];
  if(t.eyes===3){
    // Cyclops
    ov(buf,20,17,2,2,(nx,ny)=>{
      if(nx*nx+ny*ny<.22) return [12,8,6];
      return [28,18,10];
    });
    sp(buf,19,16,lt([28,18,10],.4));
  } else if(t.eyes===4){
    // VOID — black pits, clearly different from standard
    [16,23].forEach(ex=>{
      fr(buf,ex-1,16,ex+1,18,VOID);
      // Void aura — dark halo in shell around them
      [ex-2,ex+2].forEach(nx=>{sp(buf,nx,17,dk(shell(nx,'s'),.4));});
      sp(buf,ex,15,dk(shell(ex,'s'),.35));
      sp(buf,ex,19,dk(shell(ex,'s'),.35));
    });
  } else if(t.eyes===5){
    // LASER EYES — red beams shooting upward from each eye stalk
    const LC=h2r("#FF2808"),LG=h2r("#FF8820");
    [16,23].forEach((ex,ei)=>{
      fr(buf,ex-1,18,ex+1,19,dk(shell(ex,'s'),.1)); // stalk
      fr(buf,ex-1,16,ex+1,18,LC);
      sp(buf,ex,16,lt(LC,.4)); // eye highlight
      // Beam shoots upward — 2px wide core, 1px glow halo
      for(let y=0;y<=15;y++){
        const fade=y/15;
        sp(buf,ex,15-y,mix(LC,LG,fade));
        sp(buf,ex+(ei===0?-1:1),15-y,mix(LG,h2r(sc.fl),0.5+fade*0.4));
      }
    });
  } else if(t.eyes===6){
    // NOGGLES — Nouns-style square pixel glasses over the eye region
    const NF=h2r("#2040E0"),NB=h2r("#080818"); // frame color, lens dark
    // Left lens frame
    fr(buf,12,15,17,19,NF);
    fr(buf,13,16,16,18,NB); // lens interior
    // Right lens frame
    fr(buf,21,15,26,19,NF);
    fr(buf,22,16,25,18,NB); // lens interior
    // Bridge connecting the two frames
    fr(buf,18,17,20,17,NF);
    // Stem going left
    fr(buf,11,17,12,17,NF);
    // Stem going right
    fr(buf,26,17,27,17,NF);
    // Lens shine
    sp(buf,13,16,lt(NB,.25)); sp(buf,22,16,lt(NB,.25));
  } else {
    // Standard or glow
    const gc=t.eyes===1?EG:t.eyes===2?EB:null;
    const ic=gc||[20,12,8];
    [16,23].forEach((ex,ei)=>{
      fr(buf,ex-1,18,ex+1,19,dk(shell(ex,'s'),.1));// stalk
      fr(buf,ex-1,16,ex+1,18,ic);
      sp(buf,ex-1+(ei===0?1:0),16,lt(ic,.42));// highlight
      if(gc){
        const gd=mix(h2r(sc.fl),gc,.35);
        sp(buf,ex-2,17,gd);sp(buf,ex+2,17,gd);sp(buf,ex,15,gd);sp(buf,ex,19,gd);
        sp(buf,ex-1,15,mix(gd,h2r(sc.fl),.5));sp(buf,ex+1,15,mix(gd,h2r(sc.fl),.5));
      }
    });
  }

  // 12. ACCESSORIES
  const GOLD=h2r("#D4A820"),BLK=h2r("#141414"),WHT=h2r("#E8E4DC"),RED=h2r("#C82820");
  switch(t.accessory){
    case 1:
      fr(buf,13,9,26,10,BLK);fr(buf,15,6,24,9,BLK);fr(buf,17,5,22,6,BLK);
      sp(buf,19,7,WHT);sp(buf,20,7,WHT);sp(buf,19,8,WHT);sp(buf,18,8,WHT);sp(buf,21,8,WHT);
      for(let x=15;x<=24;x++) sp(buf,x,9,mix(BLK,WHT,.14));
      break;
    case 2:
      fr(buf,16,10,23,11,GOLD);
      [17,22,15,24].forEach(x=>sp(buf,x,9,GOLD));sp(buf,19,8,GOLD);sp(buf,20,8,GOLD);
      sp(buf,19,10,RED);sp(buf,21,10,RED);
      for(let x=16;x<=23;x++) sp(buf,x,10,lt(GOLD,.18));
      break;
    case 3:
      fr(buf,13,16,17,18,BLK);ln(buf,18,16,22,14,BLK);sp(buf,14,16,mix(BLK,WHT,.12));
      break;
    case 4:{
      const BC=h2r("#B0A888");
      [[18,21],[22,20],[16,25],[24,27],[20,23]].forEach(([x,y])=>{
        fr(buf,x,y,x+1,y+1,BC);sp(buf,x+1,y+1,dk(BC,.3));sp(buf,x,y,lt(BC,.12));
      }); break;
    }
    case 5:
      ov(buf,7,11,2,2,(_,ny)=>ny<0?lt(GOLD,.2):dk(GOLD,.15));
      sp(buf,7,11,mix(GOLD,[200,160,0],.6));sp(buf,6,10,lt(GOLD,.3));
      break;
    case 6:
      fr(buf,12,7,27,9,BLK);fr(buf,15,5,24,7,BLK);fr(buf,17,4,22,5,BLK);
      for(let x=12;x<=27;x++) sp(buf,x,7,GOLD);
      for(let x=15;x<=24;x++) sp(buf,x,5,dk(GOLD,.3));
      sp(buf,13,6,h2r("#E8E0D0"));sp(buf,12,5,h2r("#F0EAE0"));sp(buf,11,4,h2r("#F4EEE4"));sp(buf,10,3,h2r("#F8F4F0"));
      break;
    case 7:
      ov(buf,32,11,2,2,(nx,ny)=>mix([215,210,205],[242,240,238],(1-(nx*nx+ny*ny))*.65+.35));
      sp(buf,31,10,h2r("#F8F6F4"));
      break;
    case 8:{ // Rainbow Puke — Doodles-style arc of color from the rostrum upward between the claws
      const RAINBOW=[h2r("#FF2020"),h2r("#FF8C00"),h2r("#FFE020"),h2r("#20D020"),h2r("#2090FF"),h2r("#A020FF"),h2r("#FF40CC")];
      // Arc radiates upward from rostrum tip (x=20,y=12), fanning between x=8 and x=32
      for(let step=0;step<12;step++){
        // Each row of the arc is one step further from the rostrum
        const y=11-step;
        if(y<0) break;
        const spread=step*1.4;
        // Left stream
        const lx=Math.round(20-spread);
        const rc=RAINBOW[step%RAINBOW.length];
        sp(buf,lx,y,rc);
        sp(buf,lx-1,y,mix(rc,RAINBOW[(step+1)%RAINBOW.length],.5));
        // Right stream (different color offset so they differ)
        const rx=Math.round(20+spread);
        const rc2=RAINBOW[(step+3)%RAINBOW.length];
        sp(buf,rx,y,rc2);
        sp(buf,rx+1,y,mix(rc2,RAINBOW[(step+4)%RAINBOW.length],.5));
        // Center stream
        if(step<6) sp(buf,20,y,RAINBOW[(step+1)%RAINBOW.length]);
      }
      // Drip blobs near the mouth — thick start
      [[18,12,0],[19,12,1],[20,11,2],[21,12,3],[22,12,4]].forEach(([x,y,ci])=>sp(buf,x,y,RAINBOW[ci]));
      break;
    }
    case 9:{ // Gold Chain — BAYC-style chain draped across the carapace
      const GC=h2r("#D4A820"),GD=h2r("#A07810"),GL=h2r("#F0CC50");
      // Chain follows the curve of the carapace at y≈28, from x=12 to x=28
      const chainY=(x)=>Math.round(28+Math.sin((x-20)/8*Math.PI)*1.5);
      for(let x=12;x<=28;x++){
        const y=chainY(x);
        // Links: alternate highlight/shadow for chain-link look
        const isLink=(x%3===0);
        sp(buf,x,y,isLink?GL:GC);
        sp(buf,x,y+1,isLink?GC:GD);
        // Hanging pendant at center
        if(x===20){
          sp(buf,20,y+2,GL); sp(buf,20,y+3,GC);
          ov(buf,20,y+5,2,2,(_,ny)=>ny<0?lt(GC,.2):dk(GC,.2));
          sp(buf,20,y+4,mix(GC,GL,.6)); // pendant center shine
        }
      }
      break;
    }
    case 10:{ // Blush marks — anime/Milady-style rosy cheeks on carapace sides
      const BH=h2r("#E05080"),BL=mix(h2r("#E05080"),[0,0,0],.3);
      // Left blush cluster
      [[13,23],[14,24],[13,24],[14,23],[12,24]].forEach(([x,y])=>sp(buf,x,y,mix(BH,h2r(sc.fl),.35)));
      sp(buf,13,23,mix(BH,h2r(sc.fl),.2));
      // Right blush cluster
      [[26,23],[27,24],[26,24],[27,23],[28,24]].forEach(([x,y])=>sp(buf,x,y,mix(BH,h2r(sc.fl),.35)));
      sp(buf,27,23,mix(BH,h2r(sc.fl),.2));
      break;
    }
  }

  return buf;
}

// ─── Draw to canvas ───────────────────────────────────────────────────────────
function draw(canvas, traits) {
  if(!canvas) return;
  const buf=renderLobster(traits);
  const id=new ImageData(buf,W,H);
  const off=document.createElement('canvas'); off.width=W; off.height=H;
  off.getContext('2d').putImageData(id,0,0);
  const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(off,0,0,canvas.width,canvas.height);
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS=[
  {label:"Classic",        mutation:0,scene:6,claws:0,eyes:0,marking:0,accessory:0, brokenAntenna:false,tailVariant:0},
  {label:"Blue Baron",     mutation:1,scene:2,claws:0,eyes:2,marking:3,accessory:2, brokenAntenna:false,tailVariant:1},
  {label:"Ghost",          mutation:3,scene:7,claws:0,eyes:4,marking:0,accessory:0, brokenAntenna:false,tailVariant:0},
  {label:"Calico Corsair", mutation:5,scene:1,claws:1,eyes:0,marking:1,accessory:1, brokenAntenna:true, tailVariant:0},
  {label:"Infernal",       mutation:2,scene:3,claws:4,eyes:5,marking:7,accessory:6, brokenAntenna:false,tailVariant:0},
  {label:"Doodled",        mutation:6,scene:0,claws:0,eyes:0,marking:0,accessory:8, brokenAntenna:false,tailVariant:1},
  {label:"Chain Maxi",     mutation:4,scene:5,claws:0,eyes:6,marking:5,accessory:9, brokenAntenna:false,tailVariant:0},
  {label:"Nounish",        mutation:0,scene:6,claws:2,eyes:6,marking:0,accessory:0, brokenAntenna:false,tailVariant:0},
  {label:"Rosy",           mutation:3,scene:0,claws:0,eyes:0,marking:0,accessory:10,brokenAntenna:false,tailVariant:0},
  {label:"Sea Veteran",    mutation:7,scene:4,claws:2,eyes:0,marking:4,accessory:4, brokenAntenna:true, tailVariant:0},
  {label:"Yellow King",    mutation:4,scene:5,claws:3,eyes:0,marking:6,accessory:2, brokenAntenna:false,tailVariant:0},
  {label:"Laser Ghost",    mutation:2,scene:7,claws:0,eyes:5,marking:0,accessory:0, brokenAntenna:false,tailVariant:0},
];
const TRAIT_DEFS=[
  {key:'mutation',label:'MUTATION',items:MUTATIONS.map(m=>m.name),color:"#C84820"},
  {key:'scene',   label:'SCENE',   items:SCENES.map(s=>s.name),   color:"#1A4E8C"},
  {key:'marking', label:'MARKING', items:MARKINGS,                 color:"#8A4828"},
  {key:'claws',   label:'CLAWS',   items:CLAWS_LIST,               color:"#1E5C30"},
  {key:'eyes',    label:'EYES',    items:EYES_LIST,                color:"#204870"},
  {key:'accessory',label:'ACCESSORY',items:ACCESSORIES,            color:"#583010"},
];

export default function LobsterGallery(){
  const [view,setView]=useState('gallery');
  const [sel,setSel]=useState(null);
  const [custom,setCustom]=useState(PRESETS[0]);
  const gRefs=useRef([]);
  const bRef=useRef(null);

  useEffect(()=>{PRESETS.forEach((p,i)=>draw(gRefs.current[i],p));}, []);
  useEffect(()=>{draw(bRef.current,custom);},[custom]);

  const Btn=(active,color="#C84820")=>({
    padding:"4px 8px",fontSize:10,
    background:active?color:"#0d0d14",
    color:active?"#fff":"#444",
    border:`1px solid ${active?color:"#1a1a24"}`,
    borderRadius:2,cursor:"pointer",
    fontFamily:"'Courier New',monospace",letterSpacing:"0.07em",
  });

  return(
    <div style={{background:"#060810",minHeight:"100vh",fontFamily:"'Courier New',monospace",color:"#fff",paddingBottom:60}}>
      <div style={{borderBottom:"1px solid #0f0f18",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:"#D0581A",letterSpacing:"0.18em"}}>🦞 ONCHAIN LOBSTERS</div>
          <div style={{color:"#282838",fontSize:9,letterSpacing:"0.22em",marginTop:2}}>40×52 PIXEL · 8 COLORS · BASE · MINED WITH $CLAWDIA</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {['gallery','builder'].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{...Btn(view===v),padding:"5px 12px",textTransform:"uppercase",letterSpacing:"0.15em"}}>{v}</button>
          ))}
        </div>
      </div>

      {view==='gallery'&&(
        <div style={{padding:24}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,maxWidth:840,margin:"0 auto"}}>
            {PRESETS.map((p,i)=>(
              <div key={i} onClick={()=>setSel(sel===i?null:i)} style={{
                cursor:"pointer",border:`1px solid ${sel===i?"#C84820":"#0f0f18"}`,
                borderRadius:3,overflow:"hidden",background:"#09090f",
                transition:"all 0.12s",transform:sel===i?"scale(1.02)":"scale(1)",
              }}>
                <canvas ref={el=>gRefs.current[i]=el} width={W*7} height={H*7}
                  style={{display:"block",width:"100%",imageRendering:"pixelated"}}/>
                <div style={{padding:"7px 9px",borderTop:"1px solid #0f0f18"}}>
                  <div style={{color:"#C84820",fontSize:9,letterSpacing:"0.12em"}}>#{String(i+1).padStart(4,"0")}</div>
                  <div style={{color:"#666",fontSize:9,marginTop:2,letterSpacing:"0.08em"}}>{p.label}</div>
                  <div style={{color:"#252535",fontSize:8,marginTop:1}}>{MUTATIONS[p.mutation].name} · {SCENES[p.scene].name}</div>
                </div>
                {sel===i&&(
                  <div style={{padding:"7px 9px",borderTop:"1px solid #0a0a14",fontSize:8,color:"#333",lineHeight:1.9}}>
                    {[['MUTATION',MUTATIONS[p.mutation].name],['SCENE',SCENES[p.scene].name],
                      ['CLAWS',CLAWS_LIST[p.claws]],['EYES',EYES_LIST[p.eyes]],
                      ['MARKING',MARKINGS[p.marking]],['ACCESSORY',ACCESSORIES[p.accessory]]
                    ].map(([k,v])=><div key={k}>{k} <span style={{color:"#555"}}>{v}</span></div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{maxWidth:840,margin:"18px auto 0",padding:"10px 14px",background:"#09090f",border:"1px solid #0f0f18",borderRadius:3,fontSize:9,color:"#1e1e2e",lineHeight:1.9,letterSpacing:"0.04em"}}>
            <span style={{color:"#282838"}}>MINING </span>commit(keccak256(salt+recipient)) → wait 10 blocks → reveal() → burn $CLAWDIA → minted
            &nbsp;·&nbsp;<span style={{color:"#282838"}}>STORAGE </span>RRLE-compressed onchain SVG via SSTORE2
          </div>
        </div>
      )}

      {view==='builder'&&(
        <div style={{padding:"24px",maxWidth:840,margin:"0 auto",display:"grid",gridTemplateColumns:"210px 1fr",gap:20}}>
          <div>
            <canvas ref={bRef} width={W*5} height={H*5}
              style={{display:"block",width:"100%",imageRendering:"pixelated",border:"1px solid #0f0f18",borderRadius:3}}/>
            <div style={{marginTop:8,padding:"8px 10px",background:"#09090f",border:"1px solid #0f0f18",borderRadius:3,fontSize:8,color:"#333",lineHeight:1.9}}>
              {TRAIT_DEFS.map(({key,label,items})=>(
                <div key={key}>{label} <span style={{color:"#555"}}>{items[custom[key]||0]}</span></div>
              ))}
              <div>ANTENNA <span style={{color:"#555"}}>{custom.brokenAntenna?"Broken":"Intact"}</span></div>
            </div>
            <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:4}}>
              {PRESETS.map((p,i)=><button key={i} onClick={()=>setCustom(p)} style={{...Btn(false),fontSize:8,padding:"3px 6px"}}>{p.label}</button>)}
            </div>
          </div>
          <div>
            {TRAIT_DEFS.map(({key,label,items,color})=>(
              <div key={key} style={{marginBottom:13}}>
                <div style={{color:"#333",fontSize:9,letterSpacing:"0.16em",marginBottom:5}}>{label}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {items.map((name,i)=><button key={i} onClick={()=>setCustom(t=>({...t,[key]:i}))} style={Btn((custom[key]||0)===i,color)}>{name}</button>)}
                </div>
              </div>
            ))}
            <div style={{marginBottom:13}}>
              <div style={{color:"#333",fontSize:9,letterSpacing:"0.16em",marginBottom:5}}>MODIFIERS</div>
              <button onClick={()=>setCustom(t=>({...t,brokenAntenna:!t.brokenAntenna}))} style={Btn(custom.brokenAntenna,"#3A1E50")}>Broken Antenna</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
