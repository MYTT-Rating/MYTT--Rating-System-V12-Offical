from pathlib import Path
import re

css_path=Path('site-overrides-v24.css')
index_path=Path('index.html')
css=css_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')

def replace_source_block(style_id,replacement):
    global css
    marker=f'SOURCE: index.html <style id="{style_id}">'
    pos=css.find(marker)
    if pos<0: raise SystemExit(f'Missing source block: {style_id}')
    start=css.rfind('/* =========================================================',0,pos)
    nxt=css.find('SOURCE: index.html <style id="',pos+len(marker))
    end=len(css) if nxt<0 else css.rfind('/* =========================================================',start+1,nxt)
    if start<0 or end<=start: raise SystemExit(f'Unsafe block boundary: {style_id}')
    css=css[:start].rstrip()+'\n\n'+replacement.strip()+'\n\n'+css[end:].lstrip()

v6='''/* =========================================================
   SOURCE: index.html <style id="mytt-event-v6-clean-title-small-button">
   COMPACTED: title experiment removed because V7 restored V5 exactly.
   ========================================================= */
@media (max-width:768px){
  #events .me5-register-wrap{right:20px !important;top:52% !important;width:37% !important;transform:translateY(-12%) !important;}
  #events .me5-register{min-height:62px !important;height:62px !important;padding:0 10px !important;gap:7px !important;border-radius:11px !important;box-shadow:0 0 0 2px rgba(255,40,40,.12),0 0 13px rgba(255,25,25,.36),inset 0 0 0 1px rgba(255,255,255,.12) !important;}
  #events .me5-register::after{inset:5px !important;border-radius:7px !important;border-color:rgba(255,255,255,.17) !important;}
  #events .me5-register span{font-size:12px !important;letter-spacing:.01em !important;}
  #events .me5-register b{font-size:18px !important;}
}
@media (max-width:390px){
  #events .me5-register-wrap{width:36% !important;right:17px !important;}
  #events .me5-register{min-height:58px !important;height:58px !important;}
  #events .me5-register span{font-size:11px !important;}
  #events .me5-register b{font-size:17px !important;}
}'''
replace_source_block('mytt-event-v6-clean-title-small-button',v6)
replace_source_block('mytt-event-v7-restore-v5-title','')
replace_source_block('mytt-event-v9-solid-metal-title','')

v10='''/* =========================================================
   SOURCE: index.html <style id="mytt-event-v10-metal-flat-details">
   COMPACTED: final V12 overrides removed; facts component retained.
   ========================================================= */
.me10-facts{display:none;}
@media (max-width:768px){
  #events .me10-facts{display:grid !important;grid-template-columns:repeat(4,minmax(0,1fr)) !important;gap:7px !important;margin:10px 0 0 !important;padding:0 !important;}
  #events .me10-fact{min-width:0 !important;min-height:82px !important;padding:9px 6px 8px !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:flex-start !important;text-align:center !important;border:1px solid rgba(255,63,63,.28) !important;border-radius:13px !important;background:linear-gradient(180deg,rgba(14,12,15,.94),rgba(7,8,11,.98)) !important;box-shadow:inset 0 0 18px rgba(255,35,35,.025) !important;}
  #events .me10-fact-icon{width:28px !important;height:28px !important;display:flex !important;align-items:center !important;justify-content:center !important;margin-bottom:5px !important;border:1px solid rgba(255,60,60,.46) !important;border-radius:50% !important;color:#ff4a4a !important;font-size:15px !important;line-height:1 !important;box-shadow:0 0 10px rgba(255,38,38,.12) !important;}
  #events .me10-paddle{font-size:14px !important;}
  #events .me10-fact small{display:block !important;margin:0 0 4px !important;color:#ff5656 !important;font-size:7.5px !important;line-height:1 !important;font-weight:900 !important;letter-spacing:.08em !important;white-space:nowrap !important;}
  #events .me10-fact strong{max-width:100% !important;color:#fff !important;font-size:9.2px !important;line-height:1.12 !important;font-weight:850 !important;overflow:hidden !important;display:-webkit-box !important;-webkit-box-orient:vertical !important;-webkit-line-clamp:2 !important;}
}'''
replace_source_block('mytt-event-v10-metal-flat-details',v10)

v11='''/* =========================================================
   SOURCE: index.html <style id="mytt-event-v11-clean-status">
   COMPACTED: declarations overridden by V12 removed.
   ========================================================= */
@media (max-width:768px){
  #events .me5-status strong{white-space:normal !important;}
  #events .me5-spots{gap:4px !important;padding-left:5px !important;padding-right:4px !important;}
  #events .me5-spots strong{white-space:normal !important;overflow:visible !important;}
}'''
replace_source_block('mytt-event-v11-clean-status',v11)

for token in ['mytt-event-hero-exact-v5','mytt-event-v6-clean-title-small-button','mytt-event-v10-metal-flat-details','mytt-event-v11-clean-status','mytt-event-v12-clean-metal-compact','#events .me10-facts']:
    if token not in css: raise SystemExit(f'Missing final token: {token}')
for token in ['mytt-event-v7-restore-v5-title','mytt-event-v9-solid-metal-title','Cleaner metallic title: remove the busy multi-layer effects.']:
    if token in css: raise SystemExit(f'Dead token remains: {token}')

css_path.write_text(css.rstrip()+'\n',encoding='utf-8')
index,n=re.subn(r'site-overrides-v24\.css\?v=[^"]+','site-overrides-v24.css?v=20260821-4',index,count=1)
if n!=1: raise SystemExit(f'Cache update failed: {n}')
index_path.write_text(index,encoding='utf-8')
