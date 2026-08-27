const currents = Array.from({ length: 9 }, (_, index) => index + 1);
const nodes = Array.from({ length: 12 }, (_, index) => index + 1);

const styles = `
  .site-main { position: relative; isolation: isolate; }
  .site-main > section { z-index: 1; }
  .el-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; background: radial-gradient(circle at 12% 18%, rgba(34,211,238,.09), transparent 19rem), radial-gradient(circle at 88% 48%, rgba(37,99,235,.08), transparent 24rem), radial-gradient(circle at 35% 82%, rgba(56,189,248,.07), transparent 21rem); }
  .el-grid,.el-traces,.el-currents,.el-nodes,.el-vignette { position: absolute; inset: 0; }
  .el-grid { opacity: .34; background-image: linear-gradient(rgba(89,215,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(89,215,255,.045) 1px,transparent 1px),linear-gradient(rgba(89,215,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(89,215,255,.018) 1px,transparent 1px); background-size: 96px 96px,96px 96px,24px 24px,24px 24px; mask-image: linear-gradient(to bottom,#000,rgba(0,0,0,.5) 76%,transparent); }
  .el-traces { opacity: .44; background-image: linear-gradient(90deg,transparent 7%,rgba(69,200,255,.28) 7% 18%,transparent 18% 31%,rgba(69,200,255,.16) 31% 56%,transparent 56%),linear-gradient(90deg,transparent 43%,rgba(139,224,255,.22) 43% 79%,transparent 79%),linear-gradient(90deg,transparent 14%,rgba(69,200,255,.17) 14% 38%,transparent 38% 66%,rgba(69,200,255,.2) 66% 92%,transparent 92%),linear-gradient(90deg,transparent 4%,rgba(22,136,232,.2) 4% 48%,transparent 48% 70%,rgba(139,224,255,.17) 70% 86%,transparent 86%),linear-gradient(0deg,transparent 8%,rgba(69,200,255,.19) 8% 27%,transparent 27% 57%,rgba(69,200,255,.14) 57% 88%,transparent 88%),linear-gradient(0deg,transparent 31%,rgba(139,224,255,.16) 31% 72%,transparent 72%); background-size: 100% 1px,100% 1px,100% 1px,100% 1px,1px 100%,1px 100%; background-position: 0 11%,0 29%,0 57%,0 84%,19% 0,76% 0; background-repeat: no-repeat; filter: drop-shadow(0 0 4px rgba(69,200,255,.35)); }
  .el-current,.el-node { position: absolute; display: block; border-radius: 999px; background: #b9efff; box-shadow: 0 0 6px #8be0ff,0 0 16px rgba(69,200,255,.9),0 0 34px rgba(22,136,232,.65); }
  .el-current { width: 4.5rem; height: 2px; opacity: 0; animation: el-flow 7s linear infinite; }
  .el-current::after { content: ""; position: absolute; inset-block: -3px; inset-inline-end: -2px; width: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 18px 5px rgba(139,224,255,.9); }
  .el-current-1{top:11%;right:8%;animation-delay:-1s}.el-current-2{top:29%;right:44%;animation-delay:-4.8s;animation-duration:9s}.el-current-3{top:57%;right:14%;animation-delay:-2.5s;animation-duration:8s}.el-current-4{top:84%;right:54%;animation-delay:-6.4s;animation-duration:10s}.el-current-5{top:11%;right:64%;animation-delay:-5.2s;animation-duration:8.5s}.el-current-6{top:57%;right:60%;animation-delay:-.5s;animation-duration:11s}.el-current-7{top:84%;right:6%;animation-delay:-3.7s;animation-duration:7.5s}.el-current-8,.el-current-9{width:3.5rem;transform-origin:right center;rotate:90deg}.el-current-8{top:18%;right:19%;animation-delay:-2.1s;animation-duration:9.5s}.el-current-9{top:61%;right:76%;animation-delay:-7.2s;animation-duration:10.5s}
  .el-node { width: 5px; height: 5px; opacity: .42; animation: el-charge 4.5s ease-in-out infinite; }
  .el-node::before { content: ""; position: absolute; inset: -5px; border: 1px solid rgba(139,224,255,.38); border-radius: 3px; }
  .el-node-1{top:11%;right:18%;animation-delay:-1.1s}.el-node-2{top:11%;right:69%;animation-delay:-3.2s}.el-node-3{top:29%;right:43%;animation-delay:-2.3s}.el-node-4{top:29%;right:79%;animation-delay:-.7s}.el-node-5{top:57%;right:14%;animation-delay:-4s}.el-node-6{top:57%;right:66%;animation-delay:-1.8s}.el-node-7{top:84%;right:48%;animation-delay:-3.6s}.el-node-8{top:84%;right:86%;animation-delay:-.4s}.el-node-9{top:18%;right:19%;animation-delay:-2.8s}.el-node-10{top:71%;right:19%;animation-delay:-1.4s}.el-node-11{top:42%;right:76%;animation-delay:-3.9s}.el-node-12{top:88%;right:76%;animation-delay:-2s}
  .el-vignette { background: linear-gradient(90deg,rgba(5,11,20,.74),transparent 24%,transparent 76%,rgba(5,11,20,.62)),linear-gradient(180deg,transparent,rgba(5,11,20,.2) 52%,rgba(5,11,20,.7)); }
  @keyframes el-flow { 0%{opacity:0;translate:0 0}8%{opacity:.9}72%{opacity:.9}100%{opacity:0;translate:-42vw 0} }
  @keyframes el-charge { 0%,70%,100%{opacity:.28;scale:.85}78%{opacity:1;scale:1.35} }
  @media (prefers-reduced-motion:reduce) { .el-current,.el-node{animation:none!important}.el-current{opacity:.35} }
`;

export function ElectronicBackground() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="el-bg" aria-hidden="true">
        <div className="el-grid" />
        <div className="el-traces" />
        <div className="el-currents">{currents.map((current) => <span key={current} className={`el-current el-current-${current}`} />)}</div>
        <div className="el-nodes">{nodes.map((node) => <span key={node} className={`el-node el-node-${node}`} />)}</div>
        <div className="el-vignette" />
      </div>
    </>
  );
}
