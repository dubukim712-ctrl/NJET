import {
  Children,
  Fragment,
  isValidElement,
  type ReactNode,
} from "react";

export type SelectOption = {
  value: string;
  internalValue: string;
  label: string;
  disabled: boolean;
};

type OptionProps = {
  value?: string | number;
  label?: string;
  disabled?: boolean;
  children?: ReactNode;
};

function getTextContent(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? getTextContent(child.props.children)
          : "",
    )
    .join("");
}

export function getOptions(children: ReactNode): SelectOption[] {
  const parsed: Omit<SelectOption, "internalValue">[] = [];

  function visit(nodes: ReactNode, groupDisabled = false) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement<OptionProps>(child)) return;
      if (child.type === Fragment) {
        visit(child.props.children, groupDisabled);
        return;
      }
      if (child.type === "optgroup") {
        visit(
          child.props.children,
          groupDisabled || Boolean(child.props.disabled),
        );
        return;
      }
      if (child.type !== "option") return;

      const label = child.props.label ?? getTextContent(child.props.children);
      parsed.push({
        value: String(child.props.value ?? label),
        label,
        disabled: groupDisabled || Boolean(child.props.disabled),
      });
    });
  }

  visit(children);
  return parsed.map((option, index) => ({
    ...option,
    internalValue: `select-option-${index}`,
  }));
}
