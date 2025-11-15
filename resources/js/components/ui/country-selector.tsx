import React from 'react';
import Select, { StylesConfig, components, SingleValueProps, OptionProps } from 'react-select';
import { countries } from '@/data/countries';

interface CountrySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface CountryOption {
  value: string;
  label: string;
  flag: string;
  code: string;
}

const countryOptions: CountryOption[] = countries.map((country) => ({
  value: country.code,
  label: country.name,
  flag: country.flag,
  code: country.code,
}));

// Custom option component to display flag, name, and code
const CustomOption = (props: OptionProps<CountryOption>) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{props.data.flag}</span>
          <span>{props.data.label}</span>
        </div>
        <span className="text-xs text-gray-500">{props.data.code}</span>
      </div>
    </components.Option>
  );
};

// Custom single value component to display only name (no flag)
const CustomSingleValue = (props: SingleValueProps<CountryOption>) => {
  return (
    <components.SingleValue {...props}>
      <span>{props.data.label}</span>
    </components.SingleValue>
  );
};

export function CountrySelector({
  value,
  onValueChange,
  placeholder = "Select country...",
  className
}: CountrySelectorProps) {
  const selectedOption = countryOptions.find((option) => option.value === value);

  const customStyles: StylesConfig<CountryOption, false> = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '40px',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
      boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none',
      '&:hover': {
        borderColor: 'hsl(var(--input))',
      },
      backgroundColor: 'hsl(var(--background))',
      cursor: 'pointer',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#ffffff',
      border: '1px solid hsl(var(--border))',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      zIndex: 50,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? 'hsl(var(--accent))'
        : state.isFocused
        ? 'hsl(var(--accent) / 0.5)'
        : '#ffffff',
      color: state.isSelected || state.isFocused ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'hsl(var(--accent))',
      },
    }),
    input: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '300px',
      '::-webkit-scrollbar': {
        width: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: '#f1f1f1',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#888',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: '#555',
      },
    }),
  };

  return (
    <div className={className}>
      <Select<CountryOption>
        value={selectedOption}
        onChange={(option) => option && onValueChange(option.value)}
        options={countryOptions}
        placeholder={placeholder}
        isSearchable={true}
        styles={customStyles}
        components={{
          Option: CustomOption,
          SingleValue: CustomSingleValue,
        }}
        classNamePrefix="react-select"
        menuPlacement="top"
      />
    </div>
  );
}
