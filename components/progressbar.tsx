import React from "react";
import styledComponent from "styled-components/native";

const Wrapper = styledComponent.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-vertical: 20px;
`;

const Dot = styledComponent.View<{ active?: boolean }>`
  width: 12px;
  height: 12px;
  margin-horizontal: 6px;
  border-radius: 6px;
  background-color: ${(props: any) =>
    props.active ? props.theme.danger : props.theme.border};
`;

export const ProgressBar = ({ step, total }: { step: number; total: number }) => {
  return (
    <Wrapper>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i + 1 <= step} />
      ))}
    </Wrapper>
  );
};
