import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTACT = 'sooma.works@gmail.com'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="label text-dim">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-dim">{children}</div>
    </section>
  )
}

/** Política de privacidad pública (la pide Google para el login con Google). */
export function PrivacyPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-6 pb-16 pt-safe">
      <Link to="/" className="label mt-6 inline-flex items-center gap-2 text-faint hover:text-fg">
        <ArrowLeft className="size-3.5" /> Watch 2gder
      </Link>

      <h1 className="heading mt-8 text-[2.25rem]">
        Privacidad<span className="text-signal">.</span>
      </h1>
      <p className="label mt-3 text-faint">Última actualización: 2 de octubre de 2026</p>

      <Section title="Qué es">
        <p>
          Watch 2gder es una app para armar listas compartidas de películas, series, anime y documentales. La
          hace Sooma Works. Esta página cuenta qué datos guarda y para qué.
        </p>
      </Section>

      <Section title="Qué datos guardamos">
        <p>
          <span className="text-fg">Tu cuenta:</span> nombre y email. Si entrás con Google, recibimos solo tu nombre y
          tu email de Google; nunca tu contraseña ni otros datos de tu cuenta.
        </p>
        <p>
          <span className="text-fg">Lo que cargás:</span> tus listas, los títulos que agregás, su estado y progreso, y
          tus puntajes y comentarios.
        </p>
      </Section>

      <Section title="Quién lo ve">
        <p>
          Las personas con las que compartís una lista ven tu nombre, los títulos de esa lista y tus puntajes y
          comentarios en ella. <span className="text-fg">Tu email no se muestra a nadie.</span> Nadie más tiene
          acceso a tus listas.
        </p>
      </Section>

      <Section title="Dónde se guarda">
        <p>
          Los datos se guardan en Supabase (servidores en San Pablo, Brasil). Las búsquedas de títulos se hacen
          contra la API de TMDB, que recibe el texto que buscás pero no tus datos personales.
        </p>
      </Section>

      <Section title="Lo que no hacemos">
        <p>No vendemos ni compartimos tus datos, no mostramos publicidad y no usamos herramientas de rastreo.</p>
      </Section>

      <Section title="Borrar tu cuenta">
        <p>
          Escribinos a{' '}
          <a href={`mailto:${CONTACT}`} className="text-fg underline underline-offset-4">
            {CONTACT}
          </a>{' '}
          desde el email de tu cuenta y la borramos junto con tus listas, títulos y opiniones. Las listas compartidas
          que creó otra persona siguen existiendo para el resto de sus miembros, sin tus opiniones.
        </p>
      </Section>

      <Section title="Contacto">
        <p>
          Por cualquier consulta:{' '}
          <a href={`mailto:${CONTACT}`} className="text-fg underline underline-offset-4">
            {CONTACT}
          </a>
          .
        </p>
      </Section>
    </div>
  )
}
