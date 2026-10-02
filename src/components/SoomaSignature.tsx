import logo from '@/assets/sooma-tile-papel-tinta.svg'
import './SoomaSignature.css'

/** Firma animada de Sooma (soomaworks.com), el estudio que hizo la app. */
export function SoomaSignature() {
  return (
    <a className="sooma-signature" href="https://soomaworks.com" target="_blank" rel="noreferrer" aria-label="Hecho por Sooma">
      <span className="sooma-sig-mark" aria-hidden="true">
        <img src={logo} alt="" />
      </span>
      <span className="sooma-sig-hecho">Hecho por&nbsp;</span>
      <span className="sooma-sig-sooma">
        sooma<span className="sooma-logo-dot">.</span>
      </span>
    </a>
  )
}
