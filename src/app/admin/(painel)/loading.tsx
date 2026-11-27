// Aparece na hora enquanto a próxima tela carrega (evita a sensação de "travado").
export default function Carregando() {
  return (
    <div className="carregando" role="status" aria-label="Carregando">
      <div className="sk sk-h" /><div className="sk-tiles"><div className="sk" /><div className="sk" /><div className="sk" /><div className="sk" /></div>
      <div className="sk sk-card" /><div className="sk sk-card" />
    </div>
  );
}
