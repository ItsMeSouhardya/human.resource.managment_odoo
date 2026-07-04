import { FileText } from "lucide-react";
import type { EmployeeCard } from "../../../shared/types";

export function ResumeTab({ documents = [] }: { documents?: EmployeeCard["documents"] }) {
  return (
    <div className="profileContentGrid">
      <article className="profileTextBlock">
        <h3>About</h3>
        <p>
          Experienced team member with a strong record across HRMS workflows, collaboration, and delivery. Profile opens in view-only mode from employee cards.
        </p>
        <h3>What I love about my job</h3>
        <p>Building structured, people-friendly systems that keep every workday aligned.</p>
        <h3>My interests and hobbies</h3>
        <p>Process design, mentoring, documentation, and simple operational automation.</p>
      </article>
      <div className="sideBlocks">
        <article>
          <h3>Skills</h3>
          <button type="button">+ Add Skills</button>
        </article>
        <article>
          <h3>Certification</h3>
          <button type="button">+ Add Certification</button>
        </article>
        <article>
          <h3>Documents</h3>
          <ul className="documentList">
            {documents.length ? (
              documents.map((document) => (
                <li key={document.id}><FileText size={16} /> {document.name}</li>
              ))
            ) : (
              <li><FileText size={16} /> No documents uploaded</li>
            )}
          </ul>
        </article>
      </div>
    </div>
  );
}
