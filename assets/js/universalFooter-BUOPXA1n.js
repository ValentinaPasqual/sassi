(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function t(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(o){if(o.ep)return;o.ep=!0;const r=t(o);fetch(o.href,r)}})();const E="/sassi/";async function A(){try{const n="mapConfig_sassi",e=new Date().getTime(),s=await(await fetch(`${E}config/map-config.json?v=${e}`)).json();return localStorage.setItem(n,JSON.stringify(s)),console.log(`Configuration loaded from server (cache bypassed) and saved to ${n}`),s}catch(n){console.error("Error loading configuration from server:",n);const e=localStorage.getItem(storageKey);if(e)return console.warn("Using cached configuration from localStorage as fallback"),JSON.parse(e);throw n}}async function M(n){try{const e="mapConfig_sassi";return localStorage.setItem(e,JSON.stringify(n,null,2)),console.log(`✅ Configuration saved to ${e}`),!0}catch(e){return console.error("Error saving configuration:",e),!1}}const $=/^[A-Za-z]:\//;function f(n=""){return n&&n.replace(/\\/g,"/").replace($,e=>e.toUpperCase())}const S=/^[/\\]{2}/,L=/^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/,w=/^[A-Za-z]:$/,p=/^\/([A-Za-z]:)?$/,C=function(n){if(n.length===0)return".";n=f(n);const e=n.match(S),t=g(n),s=n[n.length-1]==="/";return n=y(n,!t),n.length===0?t?"/":s?"./":".":(s&&(n+="/"),w.test(n)&&(n+="/"),e?t?`//${n}`:`//./${n}`:t&&!g(n)?`/${n}`:n)},P=function(...n){let e="";for(const t of n)if(t)if(e.length>0){const s=e[e.length-1]==="/",o=t[0]==="/";s&&o?e+=t.slice(1):e+=s||o?t:`/${t}`}else e+=t;return C(e)};function T(){return typeof process<"u"&&typeof process.cwd=="function"?process.cwd().replace(/\\/g,"/"):"/"}const v=function(...n){n=n.map(s=>f(s));let e="",t=!1;for(let s=n.length-1;s>=-1&&!t;s--){const o=s>=0?n[s]:T();!o||o.length===0||(e=`${o}/${e}`,t=g(o))}return e=y(e,!t),t&&!g(e)?`/${e}`:e.length>0?e:"."};function y(n,e){let t="",s=0,o=-1,r=0,i=null;for(let l=0;l<=n.length;++l){if(l<n.length)i=n[l];else{if(i==="/")break;i="/"}if(i==="/"){if(!(o===l-1||r===1))if(r===2){if(t.length<2||s!==2||t[t.length-1]!=="."||t[t.length-2]!=="."){if(t.length>2){const h=t.lastIndexOf("/");h===-1?(t="",s=0):(t=t.slice(0,h),s=t.length-1-t.lastIndexOf("/")),o=l,r=0;continue}else if(t.length>0){t="",s=0,o=l,r=0;continue}}e&&(t+=t.length>0?"/..":"..",s=2)}else t.length>0?t+=`/${n.slice(o+1,l)}`:t=n.slice(o+1,l),s=l-o-1;o=l,r=0}else i==="."&&r!==-1?++r:r=-1}return t}const g=function(n){return L.test(n)},j=function(n,e){const t=v(n).replace(p,"$1").split("/"),s=v(e).replace(p,"$1").split("/");if(s[0][1]===":"&&t[0][1]===":"&&t[0]!==s[0])return s.join("/");const o=[...t];for(const r of o){if(s[0]!==r)break;t.shift(),s.shift()}return[...t.map(()=>".."),...s].join("/")},m=function(n){const e=f(n).replace(/\/$/,"").split("/").slice(0,-1);return e.length===1&&w.test(e[0])&&(e[0]+="/"),e.join("/")||(g(n)?"/":".")},x=function(n,e){const t=f(n).split("/");let s="";for(let o=t.length-1;o>=0;o--){const r=t[o];if(r){s=r;break}}return e&&s.endsWith(e)?s.slice(0,-e.length):s};class N{constructor(e){this.currentPath=this.normalizePath(window.location.pathname),this.config=e,this.basePath=this.calculateBasePath(),this.header=null,this.isScrolling=!1,this.scrollThreshold=100}normalizePath(e){return e.endsWith("/")?e+"index.html":!e.includes(".")&&!e.endsWith("/")?e+"/index.html":e}calculateBasePath(){const e="/sassi/",t=m(this.currentPath),s=j(t,e);return s===""||s==="."?"./":s||"./"}getRelativePath(e){return P(this.basePath,e)}render(){const e=this.createNavElement(),t=[{text:"Home",path:"index.html"},{text:"Mappa",path:"pages/mappa.html"},{text:"Indici",path:"pages/indici.html"},{text:"Percorsi critici",path:"pages/percorsi.html"},{text:"Progetto",path:"https://ledaprin2022pnrr.altervista.org/"}],s=this.generateNavHTML(t);return e.innerHTML=s,this.setupEventListeners(),this.setupScrollListener(),console.log("Navigation rendered from:",this.currentPath,"Base path:",this.basePath),e}generateLogoHTML(){var t,s;const e=(s=(t=this.config)==null?void 0:t.project)==null?void 0:s.projectThumbnailURL;if(e&&e.trim()!==""){const o=e.startsWith("imgs/")?this.getRelativePath(e):this.getRelativePath(`imgs/${e}`);return`
                <a href="${this.getRelativePath("index.html")}">
                    <img src="${o}" alt="Logo" class="h-10 object-contain">
                </a>
            `}else return`
                <a href="${this.getRelativePath("index.html")}" class="bg-primary-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg hover:bg-primary-700 transition duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </a>
            `}generateNavHTML(e){const t=e.map(o=>{const r=o.path.startsWith("http://")||o.path.startsWith("https://"),i=r?o.path:this.getRelativePath(o.path),l=r?'target="_blank" rel="noopener noreferrer"':"",h=!r&&this.isActivePath(o.path);let a,c;r?(a="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 font-medium transition duration-200 flex items-center gap-2",c=`
                    ${o.text}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                `):(a=`nav-link ${h?"text-primary-900 border-b-2 border-primary-600 pb-1":"text-gray-600 hover:text-primary-600"} font-medium transition duration-200`,c=o.text);const d=o.section?`data-section="${o.section}"`:"";return`<a href="${i}" ${l} class="${a}" ${d}>${c}</a>`}).join(""),s=e.map(o=>{const r=o.path.startsWith("http://")||o.path.startsWith("https://"),i=r?o.path:this.getRelativePath(o.path),l=r?'target="_blank" rel="noopener noreferrer"':"",h=!r&&this.isActivePath(o.path);let a,c;r?(a="block px-4 py-3 bg-primary-500 text-white hover:bg-primary-600 font-medium transition duration-200 flex items-center justify-between",c=`
                    ${o.text}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                `):(a=`block px-4 py-3 ${h?"text-primary-900 bg-primary-50 font-medium":"text-gray-600 hover:text-primary-600 hover:bg-gray-50"} transition duration-200`,c=o.text);const d=o.section?`data-section="${o.section}"`:"";return`<a href="${i}" ${l} class="${a}" ${d}>${c}</a>`}).join("");return`
            <div class="flex justify-between items-center h-20">
    <!-- Logo -->
    <div class="flex items-center space-x-4">
        <div class="flex items-center justify-center">
            ${this.generateLogoHTML()}
        </div>
    </div>

    <!-- Desktop Navigation -->
    <div class="hidden md:flex items-center space-x-8">
        ${t}
    </div>

    <!-- Mobile Menu Toggle -->
    <div class="md:hidden relative">
        <input type="checkbox" id="menu-toggle" class="hidden peer">
        <label for="menu-toggle" class="cursor-pointer text-gray-600 hover:text-primary-600 transition duration-200 peer-checked:text-primary-600">
            <svg class="h-6 w-6 peer-checked:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg class="h-6 w-6 hidden peer-checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </label>
        
        <div class="hidden peer-checked:block absolute right-0 top-12 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            ${s}
        </div>
    </div>
</div>
        `}isActivePath(e){const t=x(this.currentPath),s=x(e);if(t==="index.html"&&s==="index.html"&&e==="index.html"){const o=m(this.currentPath),r="/sassi/",i=r.endsWith("/")?r.slice(0,-1):r;return o===i||o===i+"/"}return t===s}createNavElement(){let e=document.querySelector("header");e||(e=document.createElement("header"),e.className="bg-white shadow-lg border-b border-primary-100 w-full sticky top-0 z-40 transition-all duration-300",document.body.insertBefore(e,document.body.firstChild)),this.header=e;let t=e.querySelector("nav");return t||(t=document.createElement("nav"),t.className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",e.appendChild(t)),t}setupScrollListener(){let e=!1;const t=()=>{if(!this.header)return;const r=window.scrollY>this.scrollThreshold;r&&!this.isScrolling?(this.isScrolling=!0,this.header.className="bg-white shadow-lg border-b border-primary-100 w-full fixed top-0 z-40 transition-all duration-300",document.body.style.paddingTop=this.header.offsetHeight+"px"):!r&&this.isScrolling&&(this.isScrolling=!1,this.header.className="bg-white shadow-lg border-b border-primary-100 w-full sticky top-0 z-40 transition-all duration-300",document.body.style.paddingTop=""),e=!1},s=()=>{e||(requestAnimationFrame(t),e=!0)};window.addEventListener("scroll",s,{passive:!0}),this.cleanupScrollListener=()=>{window.removeEventListener("scroll",s)}}setupEventListeners(){document.addEventListener("click",e=>{const t=e.target.closest("a[data-section]");if(t&&t.dataset.section){const s=t.dataset.section,o=t.getAttribute("href");if(o&&o.includes("index.html")){e.preventDefault();const r=o.split("#")[0];window.location.href=`${r}#section-${s}`}}}),document.addEventListener("click",e=>{const t=document.getElementById("menu-toggle"),s=e.target.closest(".md\\:hidden");t&&t.checked&&!s&&(t.checked=!1)})}destroy(){this.cleanupScrollListener&&this.cleanupScrollListener(),document.body.style.paddingTop=""}}class I{constructor(e){this.currentPath=window.location.pathname,this.basePath=this.calculateBasePath(),this.config=e,this.isOpen=!1,this.footerElement=null,this.carouselInterval=null,this.currentSlide=0,this.logos=[],this.initLogos()}async initLogos(){var e;try{const t=((e=window.location.pathname.match(/^\/[^\/]+\//))==null?void 0:e[0])||"/",s=`${t}imgs/institutional_logos/manifest.json`,o=await fetch(s);if(!o.ok)throw new Error(`Manifest not found: ${o.status}`);const r=await o.json();this.logos=r.map(i=>({filename:i,path:`${t}imgs/institutional_logos/${i}`})).sort((i,l)=>i.filename.localeCompare(l.filename)),this.footerElement&&this.logos.length>0&&this.updateCarousel()}catch{this.logos=[]}}updateCarousel(){const e=this.footerElement.querySelector(".footer-inner");e&&(e.innerHTML=this.generateCompactFooterHTML(),this.initCarousel())}dirname(e){return e.substring(0,e.lastIndexOf("/"))||"/"}join(...e){return e.map(t=>t.replace(/^\/+|\/+$/g,"")).filter(t=>t.length>0).join("/").replace(/\/+/g,"/")}relative(e,t){const s=e.split("/").filter(a=>a),o=t.split("/").filter(a=>a);let r=0;for(let a=0;a<Math.min(s.length,o.length)&&s[a]===o[a];a++)r++;const i=s.length-r,l=o.slice(r);return"../".repeat(i)+l.join("/")||"./"}normalizePath(e){return e.endsWith("/")?e+"index.html":!e.includes(".")&&!e.endsWith("/")?e+"/index.html":e}calculateBasePath(){var r,i,l;const e=this.dirname(this.currentPath),s="/"+(((l=(i=(r=this.config)==null?void 0:r.project)==null?void 0:i.projectShortTitle)==null?void 0:l.toLowerCase())||"leda"),o=this.relative(e,s);return o===""||o==="."?"./":o||"./"}getRelativePath(e){return this.join(this.basePath,e)}isExternalLink(e){return e.startsWith("http://")||e.startsWith("https://")}render(){return this.footerElement=this.createFooterElement(),this.setupEventListeners(),this.initCarousel(),this.footerElement}createFooterElement(){const e=document.querySelector(".footer-overlay");e&&e.remove();const t=document.createElement("div");return t.className="footer-overlay",t.innerHTML=`
            <div class="footer-trigger">
                <svg class="footer-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                </svg>
            </div>
            <div class="footer-content">
                <div class="footer-trigger">
                    <svg class="footer-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                    </svg>
                </div>
                <div class="footer-inner">
                    ${this.generateCompactFooterHTML()}
                </div>
            </div>
        `,document.body.appendChild(t),t}generateCompactFooterHTML(){var r,i,l,h;const e=new Date().getFullYear();(i=(r=this.config)==null?void 0:r.project)!=null&&i.projectTitle;const t=((h=(l=this.config)==null?void 0:l.project)==null?void 0:h.projectShortTitle)||"SASSI",s=this.getNavigationLinks().map(a=>{const c=this.isExternalLink(a.path),d=c?a.path:this.getRelativePath(a.path),u=a.section?`data-section="${a.section}"`:"",b=c?'target="_blank" rel="noopener noreferrer"':"",k=c?`
                <svg class="footer-external-icon" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            `:"";return`<li><a href="${d}" ${b} ${u}>${a.text}${k}</a></li>`}).join("");let o="";if(this.logos.length>0){const a=this.logos.map(d=>`
                <div class="footer-logo-slide">
                    <img src="${d.path}" alt="Institutional Logo - ${d.filename}" />
                </div>
            `).join(""),c=this.logos.map((d,u)=>`<span class="footer-carousel-dot ${u===0?"active":""}" data-index="${u}"></span>`).join("");o=`
                <div class="footer-logo-carousel-container">
                    <div class="footer-logo-carousel-title">Partner Istituzionali</div>
                    <div class="footer-logo-carousel">
                        <div class="footer-logo-carousel-track">
                            ${a}
                        </div>
                    </div>
                    <div class="footer-carousel-controls">
                        <button class="footer-carousel-btn footer-carousel-prev" aria-label="Previous logo">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        <div class="footer-carousel-dots">
                            ${c}
                        </div>
                        <button class="footer-carousel-btn footer-carousel-next" aria-label="Next logo">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `}return`
            <div class="footer-title">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clip-rule="evenodd"/>
                </svg>
                ${t}
            </div>
            
            <ul class="footer-nav">
                ${s}
            </ul>
            
            ${o}
            
            <div class="footer-credits">
                <div>© ${e} ${t}. Tutti i diritti riservati.</div>
                <div style="margin-top: 4px;">
                    Sviluppato con <span class="footer-heart">♥</span> per la ricerca storica
                </div>
                <div style="margin-top: 4px;">
                    Powered by OpenStreetMap • GIS Technology
                </div>
            </div>
        `}getNavigationLinks(){return[{text:"Home",path:"index.html"},{text:"Documentazione",path:"https://github.com/valentinapasqual/leda"},{text:"Contatti",path:"https://ledaprin2022pnrr.altervista.org/chi-siamo/"}]}initCarousel(){if(!this.footerElement||this.logos.length===0)return;const e=this.footerElement.querySelector(".footer-logo-carousel-track"),t=this.footerElement.querySelector(".footer-carousel-prev"),s=this.footerElement.querySelector(".footer-carousel-next"),o=this.footerElement.querySelectorAll(".footer-carousel-dot");if(!e)return;this.startCarousel(),t&&t.addEventListener("click",()=>{this.stopCarousel(),this.goToPrevSlide(),this.startCarousel()}),s&&s.addEventListener("click",()=>{this.stopCarousel(),this.goToNextSlide(),this.startCarousel()}),o.forEach(i=>{i.addEventListener("click",()=>{this.stopCarousel();const l=parseInt(i.dataset.index);this.goToSlide(l),this.startCarousel()})});const r=this.footerElement.querySelector(".footer-logo-carousel");r&&(r.addEventListener("mouseenter",()=>this.stopCarousel()),r.addEventListener("mouseleave",()=>this.startCarousel()))}startCarousel(){this.logos.length<=1||(this.stopCarousel(),this.carouselInterval=setInterval(()=>{this.goToNextSlide()},3e3))}stopCarousel(){this.carouselInterval&&(clearInterval(this.carouselInterval),this.carouselInterval=null)}goToSlide(e){var o,r;const t=(o=this.footerElement)==null?void 0:o.querySelector(".footer-logo-carousel-track"),s=(r=this.footerElement)==null?void 0:r.querySelectorAll(".footer-carousel-dot");!t||!s||(this.currentSlide=e,t.style.transform=`translateX(-${e*100}%)`,s.forEach((i,l)=>{i.classList.toggle("active",l===e)}))}goToNextSlide(){const e=(this.currentSlide+1)%this.logos.length;this.goToSlide(e)}goToPrevSlide(){const e=(this.currentSlide-1+this.logos.length)%this.logos.length;this.goToSlide(e)}toggle(){this.isOpen=!this.isOpen,this.footerElement&&(this.footerElement.classList.toggle("open",this.isOpen),this.isOpen&&this.logos.length>0?this.startCarousel():this.stopCarousel())}setupEventListeners(){if(!this.footerElement)return;this.footerElement.querySelectorAll(".footer-trigger").forEach(t=>{t.addEventListener("click",s=>{s.stopPropagation(),this.toggle()})}),this.footerElement.addEventListener("click",t=>{const s=t.target.closest("a[data-section]");if(s&&s.dataset.section){const o=s.dataset.section,r=s.getAttribute("href");if(r&&r.includes("index.html")){t.preventDefault();const i=r.split("#")[0];window.location.href=`${i}#section-${o}`,this.toggle()}}}),document.addEventListener("click",t=>{this.isOpen&&!this.footerElement.contains(t.target)&&this.toggle()}),document.addEventListener("keydown",t=>{t.key==="Escape"&&this.isOpen&&this.toggle()})}destroy(){this.stopCarousel(),this.footerElement&&this.footerElement.remove()}}export{N as U,I as a,A as l,M as s};
