import { useState } from 'react';
import type { AnswerValue, Item } from '@judgment-lab/content-schema';

interface ItemRendererProps {
  item: Item;
  onSubmit: (value: AnswerValue) => void;
}

export function ItemRenderer({ item, onSubmit }: ItemRendererProps) {
  if (item.type === 'reason_choice') return <ReasonChoiceForm item={item} onSubmit={onSubmit} />;
  if (item.type === 'fill_in') return <FillInForm item={item} onSubmit={onSubmit} />;
  if (item.type === 'own_words') return <OwnWordsForm item={item} onSubmit={onSubmit} />;
  return <p>Unsupported item type: {item.type}</p>;
}

function ReasonChoiceForm({
  item,
  onSubmit,
}: {
  item: Extract<Item, { type: 'reason_choice' }>;
  onSubmit: (value: AnswerValue) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <form
      className="item-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return;
        onSubmit({ itemType: 'reason_choice', selectedOptionIds: [selected] });
      }}
    >
      <p className="item-prompt">{item.prompt}</p>
      <div className="options">
        {item.options.map((option) => (
          <label key={option.id} className="option">
            <input
              type="radio"
              name={item.id}
              value={option.id}
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
      <button type="submit" disabled={!selected}>
        Submit
      </button>
    </form>
  );
}

function FillInForm({
  item,
  onSubmit,
}: {
  item: Extract<Item, { type: 'fill_in' }>;
  onSubmit: (value: AnswerValue) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const allFilled = item.slots.every((slot) => values[slot.id]?.trim());
  return (
    <form
      className="item-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!allFilled) return;
        onSubmit({ itemType: 'fill_in', values });
      }}
    >
      <p className="item-prompt">{item.prompt}</p>
      <div className="slots">
        {item.slots.map((slot, index) => (
          <label key={slot.id} className="slot">
            Blank {index + 1}
            <input
              type="text"
              value={values[slot.id] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [slot.id]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <button type="submit" disabled={!allFilled}>
        Submit
      </button>
    </form>
  );
}

function OwnWordsForm({
  item,
  onSubmit,
}: {
  item: Extract<Item, { type: 'own_words' }>;
  onSubmit: (value: AnswerValue) => void;
}) {
  const [draft, setDraft] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [criteriaMet, setCriteriaMet] = useState<boolean[]>(() => item.rubric.map(() => false));

  return (
    <div className="item-form">
      <p className="item-prompt">{item.prompt}</p>
      <textarea
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write your answer in your own words..."
      />
      {!revealed ? (
        <button type="button" disabled={draft.trim().length === 0} onClick={() => setRevealed(true)}>
          Compare against model answer
        </button>
      ) : (
        <>
          <div className="model-answer">
            <strong>Model answer:</strong>
            <p>{item.modelAnswer}</p>
          </div>
          <div className="rubric">
            <strong>Did your answer do this?</strong>
            {item.rubric.map((criterion, index) => (
              <label key={index} className="option">
                <input
                  type="checkbox"
                  checked={criteriaMet[index]}
                  onChange={(e) =>
                    setCriteriaMet((prev) => prev.map((v, i) => (i === index ? e.target.checked : v)))
                  }
                />
                <span>{criterion}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onSubmit({ itemType: 'own_words', draft, selfAssessedCriteriaMet: criteriaMet })
            }
          >
            Confirm self-assessment
          </button>
        </>
      )}
    </div>
  );
}
