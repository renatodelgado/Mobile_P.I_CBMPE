// hooks/useUsuarioLogado.ts
import { useAuthStore } from "@/store/authStore";

export function useUsuarioLogado() {
  const { user, isLoading } = useAuthStore();

  // Enquanto está carregando ou não tem usuário → retorna valores seguros
  if (isLoading || !user) {
    return {
      id: null,
      nome: "Carregando...",
      matricula: "",
      nomePrimeiro: "Usuário",
    };
  }

  // Só agora temos certeza que user.nome existe
  const nomePrimeiro = user.nome ? user.nome.trim().split(" ")[0] : "Usuário";

  return {
    id: user.id,
    nome: user.nome,
    matricula: user.matricula || "",
    nomePrimeiro,
  };
}