import React from "react";
import styles from "./styles.module.css";

import { Hi } from "./components/Hi";
import { Hello } from "./components/Hello";
export { Hi, Hello };

export const ExampleComponent = ({ text }) => {
  return <div className={styles.test}>Example Component: {text}</div>;
};
