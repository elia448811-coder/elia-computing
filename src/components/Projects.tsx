import Link from "next/link";
import type { CSSProperties } from "react";
import { projects } from "@/data/projects";

export function ProjectCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`project-grid ${compact ? "project-grid-compact" : ""}`}>
      {projects.map((project, index) => (
        <article key={project.id} className={`project-card project-${project.id}`} style={{ "--project-color": project.color } as CSSProperties}>
          <div className="project-art" aria-hidden="true">
            <span className="project-index">0{index + 1}</span>
            <div className="project-orbit" />
            <div className="project-monogram">{project.symbol}</div>
            <span className="project-wordmark" dir="ltr">{project.english}</span>
            <div className="project-art-lines"><i /><i /><i /></div>
          </div>
          <div className="project-card-body">
            <p className="project-category">{project.category}</p>
            <h3>{project.name}</h3>
            {!compact ? <p className="project-headline">{project.headline}</p> : null}
            <p className="project-description">{project.description}</p>
            {!compact ? <ul className="project-tags" aria-label="תחומי הפרויקט">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul> : null}
            <a className="project-link" href={project.href} target="_blank" rel="noopener noreferrer">
              <span>{project.action}<span className="sr-only"> (נפתח בחלון חדש)</span></span>
              <span className="project-link-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Projects() {
  return (
    <section id="projects" className="section-y relative" aria-labelledby="projects-title">
      <div className="container-site">
        <div className="projects-section-heading">
          <div><p className="project-category">מרעיון למוצר שעובד</p><h2 id="projects-title">הפרויקטים שלנו</h2><p className="mt-3 text-silver-muted">מערכות, אתרים וחוויות דיגיטליות שבנינו.</p></div>
          <Link href="/projects" className="btn btn-secondary">לכל הפרויקטים <span aria-hidden="true">←</span></Link>
        </div>
        <ProjectCards compact />
      </div>
    </section>
  );
}
