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
  if (item.type === 'classify') return <ClassifyForm item={item} onSubmit={onSubmit} />;
  if (item.type === 'sequence') return <SequenceForm item={item} onSubmit={onSubmit} />;
  if (item.type === 'match') return <MatchForm item={item} onSubmit={onSubmit} />;
  return <p>Unsupported item type: {item.type}</p>;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function Scenario({ text }: { text: string | undefined }) {
  if (!text) return null;
  return <p className="item-scenario">{text}</p>;
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
      <Scenario text={item.scenario} />
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
      <Scenario text={item.scenario} />
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
      <Scenario text={item.scenario} />
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

function ClassifyForm({
  item,
  onSubmit,
}: {
  item: Extract<Item, { type: 'classify' }>;
  onSubmit: (value: AnswerValue) => void;
}) {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const allPlaced = item.entries.every((entry) => placements[entry.id]);

  return (
    <form
      className="item-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!allPlaced) return;
        onSubmit({ itemType: 'classify', placements });
      }}
    >
      <Scenario text={item.scenario} />
      <p className="item-prompt">{item.prompt}</p>
      <div className="classify-entries">
        {item.entries.map((entry) => (
          <div key={entry.id} className="classify-entry">
            <p>{entry.label}</p>
            <div className="options">
              {item.categories.map((category) => (
                <label key={category.id} className="option">
                  <input
                    type="radio"
                    name={entry.id}
                    value={category.id}
                    checked={placements[entry.id] === category.id}
                    onChange={() => setPlacements((prev) => ({ ...prev, [entry.id]: category.id }))}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="submit" disabled={!allPlaced}>
        Submit
      </button>
    </form>
  );
}

function SequenceForm({
  item,
  onSubmit,
}: {
  item: Extract<Item, { type: 'sequence' }>;
  onSubmit: (value: AnswerValue) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => shuffled(item.steps.map((s) => s.id)));
  const labelById = new Map(item.steps.map((s) => [s.id, s.label]));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  return (
    <div className="item-form">
      <Scenario text={item.scenario} />
      <p className="item-prompt">{item.prompt}</p>
      <ol className="sequence-list">
        {order.map((id, index) => (
          <li key={id} className="sequence-step">
            <span>{labelById.get(id)}</span>
            <span className="sequence-controls">
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                ↑
              </button>
              <button
                type="button"
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Move down"
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onSubmit({ itemType: 'sequence', order })}>
        Submit
      </button>
    </div>
  );
}

function MatchForm({
  item,
  onSubmit,
}: {
  item: Extract<Item, { type: 'match' }>;
  onSubmit: (value: AnswerValue) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const allMatched = item.left.every((l) => selections[l.id]);

  return (
    <form
      className="item-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!allMatched) return;
        onSubmit({
          itemType: 'match',
          pairs: item.left.map((l) => ({ leftId: l.id, rightId: selections[l.id]! })),
        });
      }}
    >
      <Scenario text={item.scenario} />
      <p className="item-prompt">{item.prompt}</p>
      <div className="classify-entries">
        {item.left.map((l) => (
          <div key={l.id} className="classify-entry">
            <p>{l.label}</p>
            <div className="options">
              {item.right.map((r) => (
                <label key={r.id} className="option">
                  <input
                    type="radio"
                    name={l.id}
                    value={r.id}
                    checked={selections[l.id] === r.id}
                    onChange={() => setSelections((prev) => ({ ...prev, [l.id]: r.id }))}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="submit" disabled={!allMatched}>
        Submit
      </button>
    </form>
  );
}
