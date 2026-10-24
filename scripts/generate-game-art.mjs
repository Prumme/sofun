// Original vector illustrations for the offline game. No third-party images or logos.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../apps/server/src/content/art/', import.meta.url);
await mkdir(out, { recursive: true });
const line = (d, color = '#c4b5fd', width = 9) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x,y,w,h,color,rx=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${color}"/>`;
const circle = (x,y,r,c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const poly = (p,c) => `<polygon points="${p}" fill="${c}"/>`;
const scenes = [
 ['Minecraft','games',rect(75,230,120,120,'#7c4a2d')+rect(75,210,120,35,'#65a30d')+rect(195,170,120,180,'#865a3c')+rect(195,150,120,35,'#84cc16')+rect(315,260,120,90,'#7c4a2d')+rect(315,240,120,35,'#65a30d')],
 ['Tetris','games',Array.from({length:12},(_,i)=>rect(145+(i%4)*54,350-Math.floor(i/4)*54,50,50,['#22d3ee','#a855f7','#fbbf24'][Math.floor(i/4)])).join('')+rect(200,70,50,50,'#f472b6')+rect(254,70,50,50,'#f472b6')+rect(254,124,50,50,'#f472b6')],
 ['Pac-Man','games',`<path d="M250 250L335 165A120 120 0 1 0 335 335Z" fill="#fbbf24"/>`+circle(400,250,12,'#fff')+circle(450,250,12,'#fff')],
 ['Super Mario Bros.','games',rect(330,270,95,150,'#16a34a')+rect(315,245,125,35,'#22c55e')+rect(80,330,130,40,'#a16207')+circle(190,200,55,'#fbbf24')+`<path d="M125 195Q130 100 230 145L255 200Z" fill="#ef4444"/>`+rect(150,255,65,80,'#2563eb')],
 ['Sonic the Hedgehog','games',circle(250,245,100,'#2563eb')+poly('190,170 125,110 140,220 100,250 180,300','#2563eb')+circle(275,240,38,'#fef3c7')+line('M390 100A35 45 0 1 0 391 100','#fbbf24',12)+rect(200,335,95,35,'#ef4444',16)],
 ['The Legend of Zelda','games',poly('256,85 195,190 317,190','#fbbf24')+poly('190,195 130,300 252,300','#fbbf24')+poly('322,195 260,300 382,300','#fbbf24')+line('M256 310V440','#a7f3d0',15)+line('M210 350H302','#a7f3d0',12)],
 ['Portal','games',`<ellipse cx="150" cy="260" rx="65" ry="140" fill="none" stroke="#22d3ee" stroke-width="18"/><ellipse cx="365" cy="260" rx="65" ry="140" fill="none" stroke="#fb923c" stroke-width="18"/>`+poly('220,220 290,220 290,290 220,290','#e2e8f0')],
 ['Among Us','games',rect(175,140,160,230,'#ef4444',70)+rect(140,210,55,110,'#b91c1c',20)+rect(240,180,120,70,'#67e8f9',30)+rect(180,330,55,95,'#ef4444',15)+rect(280,330,55,95,'#ef4444',15)],
 ['Space Invaders','games',Array.from({length:3},(_,r)=>Array.from({length:7},(_,c)=>[0,6].includes(c)&&r===0?'':rect(100+c*45,160+r*45,35,35,'#a3e635')).join('')).join('')+rect(90,300,40,60,'#a3e635')+rect(380,300,40,60,'#a3e635')],
 ['Pong','games',rect(90,155,22,160,'#e2e8f0')+rect(400,260,22,160,'#e2e8f0')+rect(245,225,22,22,'#e2e8f0')+line('M256 50V190M256 280V460','#475569',3)],
 ['Titanic','films',poly('65,280 440,280 375,380 140,380','#64748b')+rect(150,220,200,60,'#e2e8f0')+rect(180,150,35,70,'#d97706')+rect(250,150,35,70,'#d97706')+poly('380,270 430,150 485,320','#bae6fd')+line('M45 405Q100 380 150 405T260 405T370 405T480 405','#22d3ee',8)],
 ['Les Dents de la mer','films',poly('190,330 275,130 310,330','#94a3b8')+line('M50 335Q120 300 180 335T310 335T450 335','#22d3ee',12)],
 ['Jurassic Park','films',line('M130 370L180 280 155 200 200 155 330 140 370 190 295 210 280 270 335 300M270 260L230 320 245 390M180 280L85 230','#a3e635',25)+circle(325,167,8,'#0b0d17')],
 ['Star Wars','films',line('M100 400L360 140','#38bdf8',16)+line('M410 400L150 140','#f87171',16)+line('M70 430L120 380','#e2e8f0',24)+line('M390 380L440 430','#e2e8f0',24)],
 ['Harry Potter','films',rect(140,245,235,150,'#64748b')+rect(125,165,65,230,'#94a3b8')+poly('110,165 158,90 205,165','#a855f7')+rect(320,135,55,260,'#94a3b8')+poly('300,135 348,60 395,135','#a855f7')+line('M70 100L100 65 90 110 120 85','#fbbf24',7)],
 ['Matrix','films',Array.from({length:9},(_,i)=>`<text x="${55+i*48}" y="110" fill="#34d399" font-family="monospace" font-size="25" writing-mode="tb">${i%2?'1010011010':'0101100101'}</text>`).join('')],
 ['Inception','films',poly('255,160 170,290 340,290','#cbd5e1')+line('M255 120V165M255 290V365','#cbd5e1',10)+`<ellipse cx="255" cy="290" rx="90" ry="20" fill="#94a3b8"/>`+line('M110 385Q250 425 400 385','#a855f7',4)],
 ['Retour vers le futur','films',rect(90,270,330,100,'#94a3b8',22)+poly('150,270 210,200 320,200 365,270','#cbd5e1')+circle(160,375,35,'#111827')+circle(360,375,35,'#111827')+circle(380,100,65,'#f8fafc')+line('M380 60V100L410 115','#111827',7)+line('M90 410L170 440M270 410L350 440','#fb923c',12)],
 ['E.T.','films',circle(300,200,140,'#fef3c7')+circle(175,330,55,'#334155')+circle(355,330,55,'#334155')+line('M175 330L250 230 280 330 175 330M250 230H320L355 330M280 330L320 230','#334155',12)+circle(270,150,30,'#334155')+line('M270 180L250 240M270 200L320 230','#334155',20)],
 ['SOS Fantômes','films',`<path d="M160 330V230Q160 110 255 120Q350 120 350 230V350L310 325 275 350 240 325 200 350Z" fill="#f8fafc"/>`+circle(225,220,12,'#111827')+circle(285,220,12,'#111827')+`<circle cx="255" cy="255" r="165" fill="none" stroke="#ef4444" stroke-width="25"/>`+line('M140 140L370 370','#ef4444',25)],
 ['France','pays',line('M150 420L255 80 365 420M185 300H325M210 220H300M140 420H375','#c4b5fd',15)+`<path d="M215 420V370Q255 325 295 370V420" fill="#0b0d17"/>`],
 ['Égypte','pays',poly('65,370 220,130 375,370','#fbbf24')+poly('280,370 375,210 470,370','#d97706')+circle(400,100,45,'#fb923c')],
 ['Japon','pays',line('M135 200V430M375 200V430M105 170Q255 210 405 170M115 235H395','#ef4444',20)+circle(255,100,40,'#f87171')],
 ['Italie','pays',`<ellipse cx="255" cy="320" rx="170" ry="90" fill="#b45309"/><ellipse cx="255" cy="220" rx="170" ry="65" fill="#fbbf24"/>`+Array.from({length:8},(_,i)=>rect(105+i*39,225,20,100,'#78350f',10)).join('')],
 ['Royaume-Uni','pays',rect(190,150,130,280,'#a16207')+poly('175,150 255,55 335,150','#d97706')+circle(255,225,47,'#fef3c7')+line('M255 190V225L280 235','#111827',7)+rect(215,330,80,100,'#78350f')],
 ['États-Unis','pays',rect(205,330,110,90,'#64748b')+poly('220,330 240,180 280,180 310,330','#6ee7b7')+circle(258,145,30,'#6ee7b7')+line('M240 200L175 110 170 65M280 210L330 250','#6ee7b7',16)+poly('150,65 170,20 190,65','#fbbf24')],
 ['Inde','pays',rect(105,260,300,140,'#f1f5f9')+`<path d="M180 260Q160 170 255 120Q350 170 330 260Z" fill="#f1f5f9"/>`+rect(80,170,25,230,'#cbd5e1')+rect(405,170,25,230,'#cbd5e1')+line('M255 95V120','#fbbf24',6)+rect(230,310,50,90,'#64748b',20)],
 ['Australie','pays',poly('180,350 220,240 215,165 240,110 260,180 310,220 350,180 330,250 270,285 320,390 270,390 230,310 200,400 150,400','#d97706')+line('M180 350L75 400','#d97706',20)+circle(245,180,5,'#111827')],
 ['Pays-Bas','pays',poly('170,420 205,210 305,210 345,420','#d97706')+line('M255 240L130 100M255 240L390 110M255 240L120 370M255 240L390 370','#fef3c7',20)+poly('185,210 255,145 325,210','#a16207')],
 ['Canada','pays',poly('255,80 285,180 340,140 320,220 400,210 340,290 365,330 280,320 280,410 230,410 230,320 145,330 170,290 110,210 190,220 170,140 225,180','#ef4444')],
];
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});
const metadata = [];
for (const [index,[answer,category,art]] of scenes.entries()) {
 const stem = `scene-${String(index+1).padStart(2,'0')}`;
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="24" fill="#111827"/><circle cx="256" cy="256" r="230" fill="#172033"/>${art}</svg>`;
 await writeFile(new URL(`${stem}.svg`,out),svg);
 await page.setContent(`<body style="margin:0">${svg}</body>`);
 await page.screenshot({path:new URL(`${stem}.png`,out).pathname});
 metadata.push({file:`${stem}.png`,answer,category});
}
await browser.close();
await writeFile(new URL('index.json',out),JSON.stringify(metadata,null,2)+'\n');
