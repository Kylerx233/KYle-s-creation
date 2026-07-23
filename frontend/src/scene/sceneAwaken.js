/**
 * Scene 4 — 山河苏醒
 * Ping-pong 双 pass 管线
 */

import * as THREE from 'three';
import { SceneBase } from './sceneBase.js';

export const sceneAwaken = { name: 'scene-awaken', description: '第四幕：山河苏醒', label: '山河苏醒' };

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const DISTURB_FRAG = /* glsl */ `
uniform sampler2D uPrev;
uniform sampler2D uOriginal;
uniform vec2 uPointer;
uniform vec2 uMouseVel;
uniform float uTime;
uniform float uEndingT;
uniform float uAspect;
varying vec2 vUv;
float cdist(vec2 a,vec2 b){vec2 d=a-b;d.x*=uAspect;return length(d);}
void main(){
  vec2 uv=vUv;
  float speed=length(uMouseVel);

  // Ending: 交互强度随 uEndingT 衰减
  float interactScale=1.-smoothstep(0.,.25,uEndingT);
  speed*=interactScale;

  float md=cdist(uv,uPointer);
  float imask=exp(-md*md/.006);

  vec2 warped=uv;
  if(speed>.00005&&imask>.001){
    vec2 moveDir=uMouseVel/speed;
    vec2 toPixel=uv-uPointer;
    float dist=length(toPixel);
    vec2 radialDir=dist>.0001?toPixel/dist:vec2(0.);
    float radialPush=exp(-md*md/.005)*speed*.35;
    float fwdPush=exp(-md*md/.012)*speed*.12;
    warped=uv-radialDir*radialPush-moveDir*fwdPush;
  }

  vec4 disturbed=texture2D(uPrev,warped);
  vec4 original=texture2D(uOriginal,uv);

  // Ending: 恢复率从 2.2% 加速到 8%，画面快速平复
  float activity=imask*speed*35.;
  float baseRecovery=mix(.022,.08,smoothstep(.2,.6,uEndingT));
  float recovery=baseRecovery*(1.-clamp(activity,0.,.85));

  gl_FragColor=mix(disturbed,original,recovery);
}
`;

const SCREEN_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uPointer;
uniform vec4 uRipples[8];
uniform float uRippleCount;
uniform float uEndingT;
uniform float uAspect;
varying vec2 vUv;
float cdist(vec2 a,vec2 b){vec2 d=a-b;d.x*=uAspect;return length(d);}
void main(){
  vec2 uv=vUv;

  // Ending: 呼吸幅度随 uEndingT 衰减
  float breatheScale=1.-smoothstep(.15,.5,uEndingT);
  float bx=snoise(vec3(uv*1.4,uTime*.07))*.0035*breatheScale;
  float by=snoise(vec3(uv*1.2+3.7,uTime*.09))*.003*breatheScale;
  vec2 warped=uv+vec2(bx,by);

  // Ending: 涟漪幅度衰减
  float rippleScale=1.-smoothstep(0.,.3,uEndingT);

  for(int i=0;i<8;i++){
    if(float(i)>=uRippleCount)break;
    vec4 r=uRipples[i];
    float elapsed=uTime-r.z;
    if(elapsed<0.||elapsed>r.w)continue;
    float lifeT=elapsed/r.w;
    float d=cdist(uv,r.xy);
    float fade=1.-smoothstep(0.,.85,lifeT);
    float r1=lifeT*.38;
    float w1=.005+lifeT*.018;
    float ring1=exp(-pow(abs(d-r1)/w1,2.));
    float r2=lifeT*.22;
    float w2=.014+lifeT*.032;
    float ring2=exp(-pow(abs(d-r2)/w2,2.))*.35;
    float total=(ring1+ring2)*fade*.009*rippleScale;
    vec2 dir=uv-r.xy;float l=length(dir);
    if(l>.0001)warped+=(dir/l)*total;
  }

  vec4 c=texture2D(uTex,warped);

  // Ending: 色彩调制衰减
  float colorScale=1.-smoothstep(.1,.4,uEndingT);
  float pd=cdist(uv,uPointer);
  float near=exp(-pd*pd/.01)*colorScale;
  float lum=dot(c.rgb,vec3(.299,.587,.114));
  c.rgb=mix(c.rgb,mix(vec3(lum),c.rgb,1.2),near*.35);
  c.g+=near*.025;c.b+=near*.015;

  // Ending: 云雾消散
  float cloudScale=1.-smoothstep(.3,.7,uEndingT);
  float cld1=snoise(vec3(uv*2.8+uTime*.012,uv.y*5.-uTime*.025));
  float cld2=snoise(vec3(uv*5.5-uTime*.018,uv.y*7.+uTime*.04));
  float cld=smoothstep(.15,.6,cld1*.55+cld2*.45)*cloudScale;
  float yInv=1.-uv.y;
  float cldMask=smoothstep(.35,.7,yInv)*(1.-smoothstep(.5,.78,yInv));
  c.rgb=mix(c.rgb,vec3(.945,.925,.87),cld*cldMask*.22);
  c.rgb+=cld*cldMask*.04;

  // [Phase 3] 宣纸纹理
  float paperBlend=smoothstep(.5,.85,uEndingT);
  float pn1=snoise(vec3(uv*120.,uTime*.02))*.025;
  float pn2=snoise(vec3(uv*280.,uTime*.03))*.012;
  float pn3=snoise(vec3(uv*550.,uTime*.05))*.006;
  float paper=(pn1+pn2+pn3)*paperBlend;
  c.rgb+=paper;
  c.rgb*=1.-paperBlend*.045;

  // [Phase 3] 卷轴收拢 — 两侧暗边随 EndingT 向中心靠拢
  float edgeBlend=smoothstep(.45,.75,uEndingT);
  float edgeWidth=mix(.12,.28,smoothstep(.5,.9,uEndingT));
  float edgeDist=min(uv.x,1.-uv.x)/max(edgeWidth,.001);
  float edgeDark=smoothstep(0.,1.,1.-clamp(edgeDist,0.,1.))*edgeBlend;
  c.rgb*=1.-edgeDark*.45;
  c.rgb+=edgeDark*vec3(.04,.025,.01);

  // [Phase 3] 古画褪色
  float vintage=smoothstep(.55,.9,uEndingT);
  c.rgb=mix(c.rgb,c.rgb*vec3(.94,.88,.78),vintage*.25);

  // 暗角（Ending 加深）
  float vignetteStr=mix(.86,1.,uEndingT*.4);
  c.rgb*=mix(vignetteStr,1.,1.-smoothstep(.35,1.3,length(uv-.5)*1.5));

  gl_FragColor=c;
}
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;

export class SceneAwaken extends SceneBase {
  constructor(opts){
    super({...opts,name:sceneAwaken.name});
    this.def=sceneAwaken;this.appState=opts.appState;this.gestureAdapter=opts.gestureInputAdapter;
    this.renderer=null;this.camera=null;
    this.rtA=null;this.rtB=null;this.readRT=null;this.writeRT=null;
    this.disturbScene=null;this.disturbMat=null;
    this.screenScene=null;this.screenMat=null;
    this.ripples=[];this.MAX_RIPPLES=12;this.rArr=[];
    this.tpx=.5;this.tpy=.5;this.px=.5;this.py=.5;
    this.prevPX=.5;this.prevPY=.5;this.mouseVelX=0;this.mouseVelY=0;
    this.tpa=0;this.pa=0;this.useGesture=false;this.disposeGesture=null;
    this._gestureActive=false;this._lastGestureTime=0;
    this.elapsed=0;this.autoTimer=0;this.w=0;this.h=0;
    this.boundMouse=e=>this.onMouse(e);this.boundResize=()=>this.resize();

    // 动态文字系统
    this._txtEl=null;this._txtState='A';this._txtTimer=0;
    this._txtUsed=[];this._txtLastSwitch=0;this._txtIdle=0;
    this._txtActivitySum=0;

    // Ending 状态机
    this._endingActive=false;this._endingT=0;this._endingElapsed=0;
    this._endingDuration=12000;this._inscriptionEl=null;
    this._endingIdle=0;this._endingTotalInteraction=0;
  }

  enter(){
    this.elapsed=0;this.autoTimer=0;this.px=.5;this.py=.5;this.tpx=.5;this.tpy=.5;
    this.prevPX=.5;this.prevPY=.5;this.mouseVelX=0;this.mouseVelY=0;
    this.pa=0;this.tpa=0;this.ripples=[];
    this._gestureActive=false;this._lastGestureTime=0;this.useGesture=false;

    // 文字气泡系统
    this._txtState='A';this._txtTimer=0;this._txtUsed=[];
    this._txtLastSwitch=0;this._txtIdle=8000;this._txtActivitySum=0;
    this._txtBubbles=[];
    this._spawnBubble(this._pick('A'));

    // Ending 重置
    this._endingActive=false;this._endingT=0;this._endingElapsed=0;
    this._endingIdle=0;this._endingTotalInteraction=0;
    if(this._inscriptionEl){this._inscriptionEl.remove();this._inscriptionEl=null;}

    // 通知 BGM 切换
    this.eventBus?.emit('scene:awaken-enter');

    // 检测 Scene 3 留下的转场遮罩，淡出
    this._fadeOverlay = document.getElementById('scene-transition-overlay');
    this._fadeStart = 0;
    this._fadingIn = !!this._fadeOverlay;

    this.setupThree();
    if(this.gestureAdapter){
      this.gestureAdapter.start();
      this.disposeGesture=this.gestureAdapter.onInput(p=>{
        if(p.type==='hand'){
          if(!this._gestureActive){
            this._gestureActive=true;
            this.prevPX=p.x/Math.max(1,this.w);
            this.prevPY=p.y/Math.max(1,this.h);
            this.px=this.prevPX;this.py=this.prevPY;
          }
          this.useGesture=true;
          this._lastGestureTime=this.elapsed;
          this.tpx=p.x/Math.max(1,this.w);
          this.tpy=p.y/Math.max(1,this.h);
          this.tpa=p.isDrawing?0.6:0.25;
          if(p.isDrawing)this.addRipple(this.tpx,this.tpy);
        }
      });
    }
    window.addEventListener('pointermove',this.boundMouse);window.addEventListener('pointerdown',this.boundMouse);window.addEventListener('resize',this.boundResize);
    this._boundKey=e=>{
      if(e.key==='e'&&!this._endingActive)this._triggerEnding();
      if(e.key==='r'&&this._endingActive){this._endingActive=false;this._endingT=0;this.camera.zoom=1;this.camera.updateProjectionMatrix();console.log('[Scene4] Ending cancelled');}
    };
    window.addEventListener('keydown',this._boundKey);
  }

  exit(){
    window.removeEventListener('pointermove',this.boundMouse);window.removeEventListener('pointerdown',this.boundMouse);window.removeEventListener('resize',this.boundResize);
    if(this._boundKey){window.removeEventListener('keydown',this._boundKey);this._boundKey=null;}
    if(this.disposeGesture){this.disposeGesture();this.disposeGesture=null;}
    if(this.gestureAdapter)this.gestureAdapter.stop();
    if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();this.renderer=null;}
    if(this.disturbMat){this.disturbMat.dispose();this.disturbMat=null;}
    if(this.screenMat){this.screenMat.dispose();this.screenMat=null;}
    if(this.rtA){this.rtA.dispose();this.rtA=null;}
    if(this.rtB){this.rtB.dispose();this.rtB=null;}
    if(this.originalTex){this.originalTex.dispose();this.originalTex=null;}
    this._txtBubbles.forEach(b=>b.el.remove());this._txtBubbles=[];
    if(this._inscriptionEl){this._inscriptionEl.remove();this._inscriptionEl=null;}
    if(this._endVeilL){this._endVeilL.remove();this._endVeilL=null;}
    if(this._endVeilR){this._endVeilR.remove();this._endVeilR=null;}
    this.disturbScene=null;this.screenScene=null;
  }

  resize(){
    if(!this.renderer)return;
    this.w=this.container.clientWidth||window.innerWidth;this.h=this.container.clientHeight||window.innerHeight;
    this.renderer.setSize(this.w,this.h);
    if(this.rtA)this.rtA.setSize(this.w,this.h);
    if(this.rtB)this.rtB.setSize(this.w,this.h);
    const aspect=this.w/Math.max(1,this.h);
    if(this.disturbMat)this.disturbMat.uniforms.uAspect.value=aspect;
  }

  setupThree(){
    this.w=this.container.clientWidth||window.innerWidth;this.h=this.container.clientHeight||window.innerHeight;
    this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false});
    this.renderer.setSize(this.w,this.h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.setClearColor(0x1a201a);
    this.renderer.domElement.style.position='absolute';this.renderer.domElement.style.inset='0';this.renderer.domElement.style.zIndex='1';
    this.container.appendChild(this.renderer.domElement);
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,-1,2);
    this.rArr=[];
    for(let i=0;i<this.MAX_RIPPLES;i++)this.rArr.push(new THREE.Vector4(0,0,-99,0));
    const cached=this.appState.getLatestGeneration();
    const sketch=this.appState.getLatestSketchDataUrl();
    const url=cached?.image_url||sketch||'';
    if(url)this.loadImage(url,sketch);
    else this.createFallback();
  }

  loadImage(url,fallback){
    const img=new Image();
    img.onload=()=>this.initPingPong(img);
    img.onerror=()=>{if(fallback&&url!==fallback)this.loadImage(fallback,'');else this.createFallback();};
    img.src=url;
  }

  createFallback(){
    // 纯黑占位，等待 AI 图就绪
    const c=document.createElement('canvas');c.width=2;c.height=2;
    const ctx=c.getContext('2d');ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,2,2);
    this.initPingPong(c);
  }

  initPingPong(img){
    const geo=new THREE.PlaneGeometry(2,2);

    this.rtA=new THREE.WebGLRenderTarget(this.w,this.h,{
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
      wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping,
    });
    this.rtB=new THREE.WebGLRenderTarget(this.w,this.h,{
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
      wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping,
    });

    // Init both RTs with the source image
    this.originalTex=new THREE.Texture(img);
    this.originalTex.minFilter=THREE.LinearFilter;this.originalTex.magFilter=THREE.LinearFilter;this.originalTex.needsUpdate=true;
    const initScene=new THREE.Scene();
    initScene.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:this.originalTex})));
    this.renderer.setRenderTarget(this.rtA);
    this.renderer.render(initScene,this.camera);
    this.renderer.setRenderTarget(this.rtB);
    this.renderer.render(initScene,this.camera);
    this.renderer.setRenderTarget(null);

    // Pass 1: disturb
    this.disturbScene=new THREE.Scene();
    this.disturbMat=new THREE.ShaderMaterial({
      uniforms:{
        uPrev:{value:this.rtA.texture},
        uOriginal:{value:this.originalTex},
        uPointer:{value:new THREE.Vector2(.5,.5)},
        uMouseVel:{value:new THREE.Vector2(0,0)},
        uTime:{value:0},
        uEndingT:{value:0},
        uAspect:{value:this.w/Math.max(1,this.h)},
      },
      vertexShader:VERT,fragmentShader:DISTURB_FRAG,
    });
    this.disturbScene.add(new THREE.Mesh(geo,this.disturbMat));

    // Pass 2: screen
    this.screenScene=new THREE.Scene();
    this.screenMat=new THREE.ShaderMaterial({
      uniforms:{
        uTex:{value:this.rtB.texture},
        uTime:{value:0},
        uPointer:{value:new THREE.Vector2(.5,.5)},
        uRipples:{value:this.rArr},
        uRippleCount:{value:0},
        uEndingT:{value:0},
        uAspect:{value:this.w/Math.max(1,this.h)},
      },
      vertexShader:VERT,fragmentShader:NOISE+SCREEN_FRAG,
      depthTest:false,depthWrite:false,
    });
    this.screenScene.add(new THREE.Mesh(geo,this.screenMat));

    this.readRT=this.rtA;this.writeRT=this.rtB;
  }

  addRipple(x,y){
    this.ripples.push({x,y,start:this.elapsed*.001,life:2.5});
    if(this.ripples.length>this.MAX_RIPPLES)this.ripples.shift();
  }

  onMouse(e){
    if(this.useGesture)return;
    this.tpx=e.clientX/Math.max(1,this.w);this.tpy=e.clientY/Math.max(1,this.h);
    this.tpa=e.buttons===1?1:0;
    if(e.type==='pointerdown')this.addRipple(this.tpx,this.tpy);
  }

  // ===== 动态文字库 =====
  _TEXTS = {
    A: ['青绿千载，山河无话','一纸江山，静默如初','风未起，水未澜','指尖轻触，可唤山河','石青未老，待君拂过','万物俱寂，唯君可醒'],
    B: ['一笔入山河','指尖过处，风生水起','山河初醒','千年一瞬','云烟渐起','青绿微澜'],
    C: ['万象流转','云动千里','江山有灵','青绿生波','笔走龙蛇','气韵生动'],
    D: ['归于青绿','山河长存，余韵未尽','一瞬千年过','墨色渐沉','风平，浪静','画如故'],
  };

  _pick(state){
    const pool=this._TEXTS[state];
    const avail=pool.filter(t=>!this._txtUsed.includes(t));
    if(!avail.length){this._txtUsed=[];return this._pick(state);}
    const t=avail[Math.floor(Math.random()*avail.length)];
    this._txtUsed.push(t);
    if(this._txtUsed.length>12)this._txtUsed.shift();
    return t;
  }

  _spawnBubbleAt(text,ux,uy){
    const el=document.createElement('div');
    el.className='poem-bubble';
    const ox=(Math.random()-.5)*80;
    const oy=-20-Math.random()*30;
    const px=ux*this.w+ox;
    const py=uy*this.h+oy;
    el.style.cssText=`
      position:fixed;z-index:10;pointer-events:none;
      left:${px}px;top:${py}px;
      font-family:'LXGW WenKai','Noto Serif SC',serif;
      font-size:clamp(1.1rem,2.2vw,1.6rem);font-weight:400;
      color:rgba(220,200,160,.95);letter-spacing:.15em;white-space:nowrap;
      opacity:0;transform:translateY(12px);transition:opacity .7s ease,transform .7s ease;
      text-shadow:0 0 18px rgba(200,180,140,.6),0 0 40px rgba(180,160,120,.3),0 2px 4px rgba(0,0,0,.4);
    `;
    el.textContent=text;
    document.body.appendChild(el);
    requestAnimationFrame(()=>{
      el.style.opacity='1';
      el.style.transform='translateY(0)';
    });
    const bubble={el,born:this.elapsed,life:3500,baseY:py};
    this._txtBubbles.push(bubble);
    if(this._txtBubbles.length>16)this._txtBubbles.shift();
    setTimeout(()=>{
      el.style.opacity='0';
      el.style.transform='translateY(-24px)';
      el.style.transition='opacity .9s ease,transform .9s ease';
      setTimeout(()=>{el.remove();},900);
    },2800);
    this._txtTimer=0;
  }

  _spawnBubble(text){
    this._spawnBubbleAt(text,this.px,1-this.py);
  }

  _tickText(dt,speed,rippleActive){
    this._txtTimer+=dt;
    this._txtIdle+=dt;
    const ds=dt/1000;

    this._txtActivitySum+=speed*ds*3.;
    this._txtActivitySum*=Math.exp(-ds/10.);

    if(speed>.0002||rippleActive){
      this._txtIdle=0;
      if(speed>.0008||rippleActive)this._txtActivitySum=Math.max(this._txtActivitySum,.003);
    }

    let next='A';
    if(this._txtIdle<1500){
      next=this._txtActivitySum>.002?'C':'B';
    }else if(this._txtIdle<4000){
      next='D';
    }

    if(this._txtTimer>=1000&&(this.elapsed-this._txtLastSwitch)>=1000){
      this._txtState=next;
      this._txtLastSwitch=this.elapsed;
      this._spawnBubble(this._pick(next));
    }

    // 更新气泡漂浮
    this._txtBubbles=this._txtBubbles.filter(b=>{
      if(this.elapsed-b.born>b.life){b.el.remove();return false;}
      const age=(this.elapsed-b.born)/1000;
      b.el.style.top=(b.baseY-age*8)+'px';
      return true;
    });
  }

  // ===== Ending 系统 =====

  _triggerEnding(){
    if(this._endingActive)return;
    this._endingActive=true;
    this._endingElapsed=0;
    this._txtBubbles.forEach(b=>{b.el.style.opacity='0';setTimeout(()=>b.el.remove(),500);});
    this._txtBubbles=[];
    this.ripples=[];

    // CSS 归卷：黑幕从两侧向中心合拢
    this._endVeilL=document.createElement('div');
    this._endVeilL.style.cssText='position:fixed;top:0;left:0;width:50vw;height:100vh;z-index:20;background:#141210;transform:translateX(-50vw);transition:transform 6s cubic-bezier(.4,0,.2,1);pointer-events:none;';
    this._endVeilR=document.createElement('div');
    this._endVeilR.style.cssText='position:fixed;top:0;right:0;width:50vw;height:100vh;z-index:20;background:#141210;transform:translateX(50vw);transition:transform 6s cubic-bezier(.4,0,.2,1);pointer-events:none;';
    document.body.appendChild(this._endVeilL);
    document.body.appendChild(this._endVeilR);
    // 下一帧开始合拢
    requestAnimationFrame(()=>{
      if(this._endVeilL)this._endVeilL.style.transform='translateX(0)';
      if(this._endVeilR)this._endVeilR.style.transform='translateX(0)';
    });

    // 10 秒后显示题跋
    setTimeout(()=>{
      if(!this._inscriptionEl){
        this._inscriptionEl=document.createElement('div');
        this._inscriptionEl.style.cssText=`
          position:fixed;inset:0;z-index:22;pointer-events:none;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          color:#1a1814;opacity:0;transition:opacity 2s;
        `;
        this._inscriptionEl.innerHTML=`
          <div style="font-family:'Ma Shan Zheng','Noto Serif SC',serif;font-size:clamp(2.2rem,5vw,4.5rem);letter-spacing:.2em;margin-bottom:1rem;text-align:center;">江山千里——绘梦成型</div>
          <div style="font-family:'Noto Sans SC',sans-serif;font-size:clamp(.7rem,1.5vw,.9rem);letter-spacing:.25em;margin-bottom:2rem;">AI × Interactive Art</div>
          <div style="font-family:'Noto Serif SC',serif;font-size:clamp(.7rem,1.2vw,.85rem);letter-spacing:.1em;line-height:2.2;text-align:center;">
            Created by 胡箬玺<br>中国传媒大学 25级智能工程与创意设计
          </div>
          <div style="font-family:'Noto Sans SC',sans-serif;font-size:clamp(.6rem,1vw,.7rem);letter-spacing:.2em;margin-top:2.5rem;">2026</div>
        `;
        document.body.appendChild(this._inscriptionEl);
        requestAnimationFrame(()=>{
          if(this._inscriptionEl)this._inscriptionEl.style.opacity='1';
        });
      }
    },10000);
  }

  update(dt){
    // 转场淡入
    if(this._fadingIn && this._fadeOverlay){
      this._fadeStart += dt;
      const dur = 800;
      const t = Math.min(1, this._fadeStart / dur);
      const e = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
      this._fadeOverlay.style.opacity = 1 - e;
      if(t >= 1){
        this._fadeOverlay.remove();
        this._fadeOverlay = null;
        this._fadingIn = false;
      }
    }

    if(!this.renderer||!this.camera)return;
    this.elapsed+=dt;
    const ds=dt/1000;

    if(this.useGesture&&this.elapsed-this._lastGestureTime>600){
      this.tpa=0;
    }

    const sp=6.;
    this.px+=(this.tpx-this.px)*(1.-Math.exp(-sp*ds));
    this.py+=(this.tpy-this.py)*(1.-Math.exp(-sp*ds));
    this.pa+=(this.tpa-this.pa)*(1.-Math.exp(-sp*ds));

    const rawVX=this.px-this.prevPX;
    const rawVY=this.py-this.prevPY;
    const vs=5.;
    this.mouseVelX+=(rawVX-this.mouseVelX)*(1.-Math.exp(-vs*ds));
    this.mouseVelY+=(rawVY-this.mouseVelY)*(1.-Math.exp(-vs*ds));
    this.prevPX=this.px;this.prevPY=this.py;

    const speed=Math.hypot(this.mouseVelX,this.mouseVelY);

    // Ending 触发检测
    if(!this._endingActive){
      // 真正的空闲：speed 为 0 且无涟漪
      const trulyIdle=speed<.00001&&this.ripples.length===0;
      if(trulyIdle){this._endingIdle+=dt;}
      else{this._endingIdle=0;}
      // 触发：空闲 6s，或按 E 键
      if(this._endingIdle>6000){
        this._triggerEnding();
      }
    }

    // Ending active: 停止接受新输入
    if(this._endingActive){
      this.tpa=0;
    }

    // 动态文字（交互时 + 空闲时随机）
    if(!this._endingActive){
      this._txtRandomTimer=(this._txtRandomTimer||0)+dt;
      // 空闲时每 2s 在随机位置生成气泡
      if(this._txtRandomTimer>2000&&speed<.00001){
        this._txtRandomTimer=0;
        const rx=.15+Math.random()*.7;
        const ry=.2+Math.random()*.5;
        this._spawnBubbleAt(this._pick(['A','D'][Math.floor(Math.random()*2)]),rx,ry);
      }
      this._tickText(dt,speed,this.ripples.length>0);
    }


    const t=this.elapsed*.001;

    // Pass 1: disturb
    if(this.disturbMat){
      this.disturbMat.uniforms.uPrev.value=this.readRT.texture;
      this.disturbMat.uniforms.uPointer.value.set(this.px,1.-this.py);
      this.disturbMat.uniforms.uMouseVel.value.set(this.mouseVelX,-this.mouseVelY);
      this.disturbMat.uniforms.uTime.value=t;
      this.renderer.setRenderTarget(this.writeRT);
      this.renderer.render(this.disturbScene,this.camera);
    }

    // Pass 2: screen
    this.renderer.setRenderTarget(null);
    if(this.screenMat){
      this.screenMat.uniforms.uTex.value=this.writeRT.texture;
      this.screenMat.uniforms.uTime.value=t;
      this.screenMat.uniforms.uPointer.value.set(this.px,1.-this.py);
      if(!this._endingActive){
        this.ripples=this.ripples.filter(r=>t-r.start<r.life);
        for(let i=0;i<this.MAX_RIPPLES;i++){
          if(i<this.ripples.length){
            const r=this.ripples[i];
            this.rArr[i].set(r.x,1.-r.y,r.start,r.life);
          }else{this.rArr[i].set(0,0,-99,0);}
        }
        this.screenMat.uniforms.uRippleCount.value=this.ripples.length;
      }else{
        this.screenMat.uniforms.uRippleCount.value=0;
      }
      this.renderer.render(this.screenScene,this.camera);
    }else{
      this.renderer.render(this.disturbScene,this.camera);
    }

    // Swap
    if(this.disturbMat){
      const tmp=this.readRT;
      this.readRT=this.writeRT;
      this.writeRT=tmp;
    }

    // 自动跳转已禁用（Scene 5/6 已删除）
  }
}
