import type { ReactNode } from "react";
import { NavButton } from "./NavButton";
import { PANEL } from "../styles";

interface Control {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}

interface Props {
  previous: Control;
  offerDraw: Control;
  resign: Control;
  forward: Control;
}

export function NavigationBar({ previous, offerDraw, resign, forward }: Props) {
  return <div className={`${PANEL} flex shrink-0 items-center gap-1 px-2 py-1.5`}><NavButton {...previous}>{previous.children}</NavButton><NavButton {...offerDraw}>{offerDraw.children}</NavButton><NavButton {...resign}>{resign.children}</NavButton><NavButton {...forward}>{forward.children}</NavButton></div>;
}
