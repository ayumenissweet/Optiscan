import CreatableSelect from "react-select/creatable";

interface OptionValue<T> {
  value: T | null;
  label: string;
}

interface SearchableProps<T> {
  options: OptionValue<T>[];
  name: string;
  value?: T | null;
  handleChange: (name: string, value: T | null) => void;
  placeholder: string;
  compact?: boolean;
}

const ellipsis = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

export function SearchableSelect<T>({
  options,
  name,
  value,
  handleChange,
  placeholder,
  compact = false,
}: SearchableProps<T>) {
  const selectedOption =
    value != null
      ? (options.find((o) => o.value === value) ?? {
          value,
          label: String(value),
        })
      : null;

  return (
    <div className="w-full min-w-0">
      <CreatableSelect<OptionValue<T>>
        options={options}
        value={selectedOption}
        isSearchable
        placeholder={placeholder}
        className="w-full text-sm"
        classNamePrefix="lens-select"
        onChange={(option) => handleChange(name, option?.value ?? null)}
        onCreateOption={(input) => handleChange(name, input as T)}
        styles={{
          control: (base) => ({
            ...base,
            minWidth: 0,
            minHeight: 38,
            height: 38,
            borderRadius: "0.75rem",
            borderColor: "#d2d2d2",
            padding: "0 2px",
            boxShadow: "none",
            cursor: "text",
          }),
          valueContainer: (base) => ({
            ...base,
            minWidth: 0,
            padding: compact ? "0 2px 0 8px" : "0 6px",
          }),
          input: (base) => ({ ...base, margin: 0, padding: 0 }),
          singleValue: (base) => ({ ...base, ...ellipsis }),
          placeholder: (base) => ({
            ...base,
            color: "#5a5a5a",
            ...(compact && { maxWidth: "100%", ...ellipsis }),
          }),
          option: (base, state) => ({
            ...base,
            cursor: "pointer",
            backgroundColor: state.isFocused ? "#f3f3f3" : "#fff",
            color: "#0f172a",
          }),
          indicatorSeparator: () => ({ display: "none" }),
          dropdownIndicator: (base) => ({
            ...base,
            color: "#5a5a5a",
            padding: compact ? "0 4px 0 0" : 4,
            ...(compact && { "& svg": { width: 14, height: 14 } }),
          }),
        }}
      />
    </div>
  );
}
