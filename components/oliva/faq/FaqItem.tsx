"use client";

type FaqItemProps = {
  id: string;
  question: string;
  answer: string[];
  open: boolean;
  onToggle: (id: string) => void;
};

export function FaqItem({
  id,
  question,
  answer,
  open,
  onToggle
}: FaqItemProps) {
  const panelId = `faq-panel-${id}`;
  const buttonId = `faq-button-${id}`;

  return (
    <div className="oliva-faq-item" data-open={open ? "true" : "false"}>
      <h3>
        <button
          id={buttonId}
          type="button"
          className="oliva-faq-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(id)}
        >
          <span className="font-sans text-base font-semibold leading-snug tracking-tight text-[#1b1c19] sm:text-lg">
            {question}
          </span>
          <svg
            className="oliva-faq-chevron"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 7.5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="oliva-faq-panel"
      >
        <div className="oliva-faq-panel-inner">
          <div className="oliva-faq-answer space-y-3 text-base leading-relaxed text-[#53433e]">
            {answer.map((paragraph, index) => (
              <p
                key={index}
                className={
                  index === 0 && /^(Sí|No)\.?$/.test(paragraph)
                    ? "font-medium text-[#1b1c19]"
                    : undefined
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
