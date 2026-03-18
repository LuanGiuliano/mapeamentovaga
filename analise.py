import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Carregar a sua base filtrada
df = pd.read_csv("BASEPRINCIPAL.xlsx - Página1.csv")

# 2. Limpar os nomes das colunas para facilitar
df.columns = df.columns.str.replace('\n', ' ').str.strip()

# 3. Gerar Gráfico de Vagas por DRE
plt.figure(figsize=(12, 6))
sns.countplot(data=df, y='DRE', order=df['DRE'].value_counts().index, palette='viridis')
plt.title('Quantidade de Vagas em Aberto por DRE', fontsize=14)
plt.xlabel('Número de Vagas', fontsize=12)
plt.ylabel('DRE', fontsize=12)
plt.tight_layout()
plt.savefig('vagas_por_dre.png') # Salva a imagem
plt.close()

# 4. Gerar Gráfico de Vagas por Cargo
plt.figure(figsize=(10, 5))
sns.countplot(data=df, y='ATIVIDADE', order=df['ATIVIDADE'].value_counts().index, palette='magma')
plt.title('Quantidade de Vagas em Aberto por Cargo (Atividade)', fontsize=14)
plt.xlabel('Número de Vagas', fontsize=12)
plt.ylabel('Cargo', fontsize=12)
plt.tight_layout()
plt.savefig('vagas_por_cargo.png') # Salva a imagem
plt.close()

# 5. Criar e exportar a Planilha Final Limpa para a Coordenadora
df_relatorio = df[['DRE', 'ATIVIDADE', 'NOME DA ESCOLA', 'DATA FIM PRORROGAÇÃO (VACANCIA) RELACIONADOS']].copy()
df_relatorio = df_relatorio.sort_values(by=['DRE', 'ATIVIDADE'])
df_relatorio.to_excel('Relatorio_Mapeamento_Vagas_Urgente.xlsx', index=False)

print("Relatório Analítico e Gráficos gerados com sucesso!")