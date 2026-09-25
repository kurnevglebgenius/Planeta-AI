import Image from "next/image";

export function Brand() {
  return <div className="brand-lockup"><Image className="brand-logo" src="/planeta-shtor-logo.svg" alt="" width={72} height={48}/><span className="brand-divider"/><span className="brand-name"><strong>Planeta AI</strong><small>Планета штор</small></span></div>;
}
