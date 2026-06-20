/* Editor — loaded INSTEAD of app.js when the URL has ?edit (see index.html).
   Lets Joseph reorder/move/remove photos, fix crops (focal point + fill/fit),
   and correct text, then Save (POST /api/save -> data/trip.js via edit-server.js).
   This file is the whole edit layer — delete it + revert the server to go public. */
(function () {
  "use strict";
  var TRIP = window.TRIP, meta = TRIP.meta, S = TRIP.sections;
  var dragSrc = null;

  function el(t, c, h){ var e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }
  function isVideo(m){ return !!m.video; }
  function thumbSrc(m){ return m.video ? (m.poster||m.src) : m.src; }

  /* take over the page (the public renderer app.js is not loaded in edit mode) */
  document.body.classList.add("editing");
  var story=document.querySelector(".story"); if(story) story.remove();
  var cv=document.getElementById("cover"); if(cv) cv.style.display="none";
  var ft=document.getElementById("foot"); if(ft) ft.style.display="none";

  var root=el("div","ed-root"); document.body.appendChild(root);
  var bar=el("div","ed-bar");
  bar.innerHTML='<span class="ed-title">Editing — '+esc(meta.title)+'</span>'+
    '<span class="ed-hint">drag photos to reorder, or across days to move • ◎ fixes the crop • ✕ removes • edit any text • then Save</span>'+
    '<span class="ed-status" id="edStatus"></span>'+
    '<a class="ed-view" href="'+location.pathname+'">← Done / View</a>'+
    '<button class="ed-save" id="edSave">Save</button>';
  root.appendChild(bar);
  var wrap=el("div","ed-wrap"); root.appendChild(wrap);

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }

  /* focal 3x3 + fill/fit toggle. setPos("x% y%"), toggleFit() */
  function focalControls(getFit, setPos, toggleFit){
    var box=el("div","ed-focalbox");
    var grid=el("div","ed-focal");
    ["0%","50%","100%"].forEach(function(y){ ["0%","50%","100%"].forEach(function(x){
      var b=el("button","ed-dot"); b.type="button"; b.title="focus "+x+" "+y;
      b.onclick=function(ev){ ev.stopPropagation(); setPos(x+" "+y); };
      grid.appendChild(b);
    });});
    var fit=el("button","ed-fit"); fit.type="button";
    function label(){ fit.textContent = (getFit()==="contain") ? "Showing whole photo" : "Filling (cropped)"; }
    fit.onclick=function(ev){ ev.stopPropagation(); toggleFit(); label(); };
    label();
    box.appendChild(grid); box.appendChild(fit);
    return box;
  }

  /* ---- cover ---- */
  function coverCard(){
    var c=el("div","ed-cover","<div class='ed-h'>Cover</div>");
    var fig=el("div","ed-cover-fig");
    var img=el("img"); img.src=meta.cover; img.style.objectFit=meta.coverFit||"cover"; img.style.objectPosition=meta.coverPos||"50% 50%";
    fig.appendChild(img); c.appendChild(fig);
    c.appendChild(focalControls(
      function(){ return meta.coverFit||"cover"; },
      function(p){ meta.coverPos=p; img.style.objectPosition=p; },
      function(){ meta.coverFit=(meta.coverFit==="contain"?"cover":"contain"); img.style.objectFit=meta.coverFit; }
    ));
    c.appendChild(el("div","ed-note","The feature photo of each day (and this cover) is the one that crops — use ◎ to set its focal point, or switch to “whole photo”."));
    return c;
  }

  /* ---- one media thumbnail ---- */
  function thumb(si, mi){
    var m=S[si].media[mi];
    var box=el("div","ed-thumbbox");
    var t=el("div","ed-thumb"); t.draggable=true; t.dataset.s=si; t.dataset.i=mi;
    var im=el("img"); im.src=thumbSrc(m); im.style.objectFit=m.fit||"cover"; im.style.objectPosition=m.pos||"50% 50%"; t.appendChild(im);
    var tags=el("div","ed-tags");
    if(mi===0) tags.appendChild(el("span","ed-tag feat","Feature"));
    if(isVideo(m)) tags.appendChild(el("span","ed-tag vid","▶"));
    t.appendChild(tags);
    var act=el("div","ed-act");
    var bF=el("button","ed-b","◎"); bF.type="button"; bF.title="set crop / focal point";
    var bD=el("button","ed-b del","✕"); bD.type="button"; bD.title="remove from journal";
    bD.onclick=function(){ S[si].media.splice(mi,1); render(); };
    act.appendChild(bF); act.appendChild(bD); t.appendChild(act);
    box.appendChild(t);
    // focal popover
    var pop=focalControls(
      function(){ return m.fit||"cover"; },
      function(p){ m.pos=p; im.style.objectPosition=p; },
      function(){ m.fit=(m.fit==="contain"?"cover":"contain"); im.style.objectFit=m.fit||"cover"; }
    );
    pop.classList.add("ed-pop"); pop.style.display="none"; box.appendChild(pop);
    bF.onclick=function(ev){ ev.stopPropagation(); pop.style.display=(pop.style.display==="none"?"block":"none"); };
    // caption
    var cap=el("input","ed-cap"); cap.placeholder="caption (optional)"; cap.value=m.caption||"";
    cap.oninput=function(){ m.caption=cap.value||undefined; };
    box.appendChild(cap);
    // drag & drop
    t.addEventListener("dragstart",function(e){ dragSrc={s:si,i:mi}; t.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text","x"); });
    t.addEventListener("dragend",function(){ t.classList.remove("dragging"); });
    t.addEventListener("dragover",function(e){ e.preventDefault(); t.classList.add("over"); });
    t.addEventListener("dragleave",function(){ t.classList.remove("over"); });
    t.addEventListener("drop",function(e){ e.preventDefault(); e.stopPropagation(); t.classList.remove("over"); moveItem(dragSrc,{s:si,i:mi}); });
    return box;
  }

  function moveItem(from,to){
    if(!from) return;
    var item=S[from.s].media[from.i]; if(!item) return;
    S[from.s].media.splice(from.i,1);
    var arr=S[to.s].media, ti=to.i;
    if(from.s===to.s && from.i<to.i) ti=to.i-1;
    if(ti<0) ti=0; if(ti>arr.length) ti=arr.length;
    arr.splice(ti,0,item);
    render();
  }

  function field(label, val, on, wide){
    var f=el("label","ed-field"+(wide?" wide":""),"<span>"+label+"</span>");
    var inp=el("input"); inp.value=val||""; inp.oninput=function(){ on(inp.value); };
    f.appendChild(inp); return f;
  }

  /* ---- one section ---- */
  function sectionCard(s, idx){
    var c=el("div","ed-sec");
    var head=el("div","ed-sechead","<div class='ed-day'>"+esc(s.day)+"</div>");
    var fields=el("div","ed-fields");
    fields.appendChild(field("Date", s.date, function(v){ s.date=v; }));
    fields.appendChild(field("Location", s.place, function(v){ s.place=v; }, true));
    fields.appendChild(field("Title", s.title, function(v){ s.title=v; }, true));
    head.appendChild(fields); c.appendChild(head);

    var ta=el("textarea","ed-body"); ta.value=(s.body||[]).join("\n\n"); ta.placeholder="Write the day… (leave a blank line between paragraphs)";
    ta.oninput=function(){ s.body=ta.value.split(/\n\s*\n/).map(function(x){return x.trim();}).filter(Boolean); };
    c.appendChild(ta);

    var grid=el("div","ed-grid"); grid.dataset.s=idx;
    (s.media||[]).forEach(function(m,i){ grid.appendChild(thumb(idx,i)); });
    grid.addEventListener("dragover",function(e){ e.preventDefault(); });
    grid.addEventListener("drop",function(e){ e.preventDefault(); moveItem(dragSrc,{s:idx,i:S[idx].media.length}); });
    c.appendChild(grid);
    return c;
  }

  // ---- highlights (top strip) editing ----
  var dragHl = null;
  function moveHl(from, to){
    if (from == null) return; var item = meta.highlights[from]; if (!item) return;
    meta.highlights.splice(from, 1);
    var ti = to; if (from < to) ti = to - 1; if (ti < 0) ti = 0; if (ti > meta.highlights.length) ti = meta.highlights.length;
    meta.highlights.splice(ti, 0, item); render();
  }
  function hlThumb(i){
    var m = meta.highlights[i];
    var box = el("div","ed-thumbbox");
    var t = el("div","ed-thumb"); t.draggable = true;
    var im = el("img"); im.src = m.src; t.appendChild(im);
    var act = el("div","ed-act");
    var bD = el("button","ed-b del","✕"); bD.type = "button"; bD.title = "remove highlight";
    bD.onclick = function(){ meta.highlights.splice(i,1); render(); };
    act.appendChild(bD); t.appendChild(act); box.appendChild(t);
    var dayInp = el("input","ed-cap"); dayInp.placeholder = "day (e.g. Day 9)"; dayInp.value = m.day || ""; dayInp.oninput = function(){ m.day = dayInp.value || undefined; };
    var capInp = el("input","ed-cap"); capInp.placeholder = "caption"; capInp.value = m.caption || ""; capInp.oninput = function(){ m.caption = capInp.value || undefined; };
    box.appendChild(dayInp); box.appendChild(capInp);
    t.addEventListener("dragstart", function(e){ dragHl = i; t.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text","x"); });
    t.addEventListener("dragend", function(){ t.classList.remove("dragging"); });
    t.addEventListener("dragover", function(e){ e.preventDefault(); t.classList.add("over"); });
    t.addEventListener("dragleave", function(){ t.classList.remove("over"); });
    t.addEventListener("drop", function(e){ e.preventDefault(); e.stopPropagation(); t.classList.remove("over"); moveHl(dragHl, i); });
    return box;
  }
  function highlightsCard(){
    if (!meta.highlights) meta.highlights = [];
    var c = el("div","ed-sec");
    c.appendChild(el("div","ed-h","Highlights — top strip"));
    var grid = el("div","ed-grid");
    meta.highlights.forEach(function(m,i){ grid.appendChild(hlThumb(i)); });
    grid.addEventListener("dragover", function(e){ e.preventDefault(); });
    grid.addEventListener("drop", function(e){ e.preventDefault(); moveHl(dragHl, meta.highlights.length); });
    c.appendChild(grid);
    c.appendChild(el("div","ed-note","Add a caption + the day each highlight is from. Drag to reorder, ✕ to remove."));
    return c;
  }

  function render(){
    wrap.innerHTML="";
    wrap.appendChild(coverCard());
    if ((meta.highlights || []).length) wrap.appendChild(highlightsCard());
    S.forEach(function(s,i){ wrap.appendChild(sectionCard(s,i)); });
  }
  render();

  /* ---- save ---- */
  document.getElementById("edSave").onclick=function(){
    var st=document.getElementById("edStatus");
    st.textContent="Saving…"; st.className="ed-status";
    fetch("/api/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(TRIP)})
      .then(function(r){ return r.json(); })
      .then(function(d){ st.textContent=d.ok?"Saved ✓":("Error: "+(d.error||"?")); st.className="ed-status "+(d.ok?"ok":"err"); })
      .catch(function(){ st.textContent="Save failed — is the edit server running?"; st.className="ed-status err"; });
  };
})();
