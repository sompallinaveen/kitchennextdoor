function makeChoice(choice = {}) {
  return {
    id: crypto.randomUUID(),
    label: choice.label || "",
    price: choice.price ?? "",
  };
}

function makeGroup(group = {}) {
  return {
    id: crypto.randomUUID(),
    name: group.name || "",
    choices: (group.choices?.length ? group.choices : [{}]).map(makeChoice),
  };
}

export default function OptionBuilder({ value, onChange }) {
  const groups = value.map((group) => ({
    ...group,
    id: group.id || crypto.randomUUID(),
    choices: group.choices.map((choice) => ({ ...choice, id: choice.id || crypto.randomUUID() })),
  }));

  function updateGroup(groupId, update) {
    onChange(groups.map((group) => group.id === groupId ? { ...group, ...update } : group));
  }

  function updateChoice(groupId, choiceId, update) {
    onChange(groups.map((group) => group.id === groupId
      ? { ...group, choices: group.choices.map((choice) => choice.id === choiceId ? { ...choice, ...update } : choice) }
      : group));
  }

  return (
    <div className="option-builder">
      <div className="dish-form-section-heading">
        <div>
          <strong>Customisations</strong>
          <span>Optional add-ons and choices for your dish</span>
        </div>
        <button type="button" className="text-action" onClick={() => onChange([...groups, makeGroup()])}>+ Add group</button>
      </div>
      {!groups.length ? (
        <p className="option-builder-empty">No customisation groups added.</p>
      ) : groups.map((group, groupIndex) => (
        <fieldset className="option-builder-group" key={group.id}>
          <legend>Option group {groupIndex + 1}</legend>
          <div className="option-group-header">
            <label>
              Group name
              <input
                value={group.name}
                onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                placeholder="e.g. Spice level"
              />
            </label>
            <button
              type="button"
              className="remove-option-button"
              onClick={() => onChange(groups.filter((item) => item.id !== group.id))}
            >Remove group</button>
          </div>
          {group.choices.map((choice, choiceIndex) => (
            <div className="option-choice-editor" key={choice.id}>
              <label>
                Choice {choiceIndex + 1}
                <input
                  value={choice.label}
                  onChange={(event) => updateChoice(group.id, choice.id, { label: event.target.value })}
                  placeholder="e.g. Mild"
                />
              </label>
              <label>
                Add-on ₹
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={choice.price}
                  onChange={(event) => updateChoice(group.id, choice.id, { price: event.target.value })}
                  placeholder="0"
                />
              </label>
              <button
                type="button"
                className="remove-option-button"
                aria-label={`Remove choice ${choiceIndex + 1}`}
                onClick={() =>
                  updateGroup(group.id, {
                    choices: group.choices.filter((item) => item.id !== choice.id),
                  })
                }
              >×</button>
            </div>
          ))}
          <button
            type="button"
            className="text-action add-choice-action"
            onClick={() => updateGroup(group.id, { choices: [...group.choices, makeChoice()] })}
          >+ Add choice</button>
        </fieldset>
      ))}
    </div>
  );
}
