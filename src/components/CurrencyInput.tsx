import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({ value, onChange, placeholder, className }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  // Formata o valor inicial
  useEffect(() => {
    if (value) {
      setDisplayValue(formatCurrency(value));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const formatCurrency = (val: string) => {
    // Remove tudo que não é dígito
    const cleanValue = val.replace(/\D/g, "");
    if (!cleanValue) return "";

    // Converte para centavos (número)
    const cents = parseInt(cleanValue, 10);
    const formatter = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return formatter.format(cents / 100);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    
    // Atualiza o display local com a máscara
    setDisplayValue(formatCurrency(rawValue));
    
    // Envia o valor bruto para o pai (opcional, mas melhor para cálculos)
    // No entanto, o sistema atual espera uma string formatada ou numérica
    // Vamos enviar o valor formatado para manter a compatibilidade com o que o usuário pediu
    onChange(formatCurrency(rawValue));
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder || "R$ 0,00"}
      className={className}
    />
  );
}
