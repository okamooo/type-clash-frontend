import styles from "./SlimeButton.module.css";

type SlimeButtonProps = Readonly<{
  isClicked: boolean;
  isOpen: boolean;
  onClick: () => void;
}>;

export default function SlimeButton({
  isClicked,
  isOpen,
  onClick,
}: SlimeButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.trigger} group flex cursor-pointer flex-col items-center`}
      aria-expanded={isOpen}
      aria-label="ユーザーメニューを開く"
      onClick={onClick}
    >
      <span
        className={`${styles.shadow} ${isClicked ? styles.shadowClicked : ""}`}
        aria-hidden="true"
      />
      <span
        className={`${styles.character} ${
          isClicked ? styles.characterClicked : ""
        }`}
        aria-hidden="true"
      >
        <span className={`${styles.eye} ${styles.eyeLeft}`} />
        <span className={`${styles.eye} ${styles.eyeRight}`} />
        <span className={styles.mouth} />
      </span>
    </button>
  );
}
