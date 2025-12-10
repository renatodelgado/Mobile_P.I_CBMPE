// app/sobre.tsx
import { useRouter } from 'expo-router';
import { ArrowLeft, ChalkboardTeacher, Code, Info, TreeStructure, Users, Wrench } from 'phosphor-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
    Card,
    Container,
    Greeting,
    Header,
    Scroll,
    Section,
    SectionTitle,
    Subtitle
} from '../styles/styles';

export default function Sobre() {
    const router = useRouter();
    const desenvolvedores = [
        'João Victor Rodrigues Basante',
        'João Vitor Malveira da Silva',
        'Maria Clara de Melo',
        'Renato Trancoso Branco Delgado',
        'Thayana Anália dos Santos Lira',
        'Vinicius Henrique Silva Nascimento',
    ];

    const professores = [
        { disciplina: 'Coding Mobile', professor: 'Prof. Geraldo Júnior (orientador)' },
        { disciplina: 'User Experience', professor: 'Prof. Marcos Tenório' },
        { disciplina: 'Backend e Arquitetura', professor: 'Prof. Danilo Farias' },
        { disciplina: 'Comunicação Empresarial', professor: 'Prof. Carol Luz' },
        { disciplina: 'Engenharia de Software', professor: 'Prof. Sonia Gomes' },
        { disciplina: 'Data Science', professor: 'Prof. Welton Dionísio' },
    ];

    const tecnologias = [
        'React + TypeScript (Web)',
        'React Native + Expo (Mobile)',
        'Node.js + Express (Backend)',
        'MySQL + TypeORM (Banco)',
        'Vercel / Netlify (Deploy Web)',
        'Railway (API + Banco)',
        'Cloudinary (Uploads)',
    ];

    return (
        <Container>
            <Header>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={28} color="#64748b" weight="bold" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Greeting>Sobre o Sistema</Greeting>
                    <Subtitle>Informações sobre a plataforma</Subtitle>
                </View>
            </Header>

            <Scroll showsVerticalScrollIndicator={false}>
                {/* Visão Geral */}
                <Section style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>

                        <Info size={28} color="#dc2626" weight="fill" />
                        <SectionTitle>Visão Geral</SectionTitle>
                    </View>
                    <Card>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>

                        </View>

                        <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22 }}>
                            O sistema foi desenvolvido para o <Text style={{ fontWeight: '700' }}>Corpo de Bombeiros Militar de Pernambuco (CBMPE)</Text>, com o objetivo de modernizar o fluxo de registro, gestão e acompanhamento de ocorrências.
                        </Text>
                        <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, marginTop: 12 }}>
                            É composto por dois módulos que operam de forma integrada: <Text style={{ fontWeight: '700' }}>Painel Web Administrativo</Text> e <Text style={{ fontWeight: '700' }}>Aplicativo Mobile para Operadores em Campo</Text>, compartilhando o mesmo backend.
                        </Text>
                    </Card>
                </Section>

                {/* Estrutura da Plataforma */}
                <Section style={{ marginTop: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <TreeStructure size={28} color="#dc2626" weight="fill" />
                        <SectionTitle>Estrutura da Plataforma</SectionTitle>
                    </View>
                    <Card style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 }}>
                            Painel Web — Administrativo
                        </Text>
                        <Text style={{ color: '#64748b', lineHeight: 20 }}>
                            • Cadastro de novas ocorrências{'\n'}
                            • Gestão e edição de registros{'\n'}
                            • Dashboard com gráficos e heatmaps{'\n'}
                            • Gestão de usuários e permissões
                        </Text>
                    </Card>

                    <Card>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 }}>
                            Aplicativo Mobile — Operadores em Campo
                        </Text>
                        <Text style={{ color: '#64748b', lineHeight: 20 }}>
                            • Cadastro e edição de ocorrências{'\n'}
                            • Funcionamento offline{'\n'}
                            • Sincronização automática ao ficar online
                        </Text>
                    </Card>
                </Section>

                {/* Equipe Desenvolvedora */}
                <Section style={{ marginTop: 32 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <Users size={28} color="#dc2626" weight="fill" />
                        <SectionTitle>Equipe Desenvolvedora</SectionTitle>
                    </View>

                    <Card>
                        <Text style={{ fontSize: 15, color: '#475569', marginBottom: 12 }}>
                            Projeto desenvolvido pelos estudantes do <Text style={{ fontWeight: '700' }}>Grupo 1 da turma 43</Text> da Faculdade Senac Pernambuco, como Projeto Integrador do 3º período.
                        </Text>

                        {desenvolvedores.map((nome, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                                <Text style={{ fontSize: 20, color: '#dc2626', marginRight: 10 }}>•</Text>
                                <Text style={{ fontSize: 16, color: '#1e293b' }}>{nome}</Text>
                            </View>
                        ))}
                    </Card>
                </Section>

                {/* Professores */}
                <Section style={{ marginTop: 28 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <ChalkboardTeacher size={28} color="#dc2626" weight="fill" />
                        <SectionTitle>Professores e Disciplinas</SectionTitle>
                    </View>

                    <Card>
                        {professores.map((p, i) => (
                            <View key={i} style={{ marginVertical: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b' }}>{p.disciplina}</Text>
                                <Text style={{ fontSize: 15, color: '#64748b', marginTop: 2 }}>{p.professor}</Text>
                                {i < professores.length - 1 && (
                                    <View style={{ height: 1, backgroundColor: '#e2e8f0', marginTop: 10 }} />
                                )}
                            </View>
                        ))}
                    </Card>
                </Section>

                {/* Tecnologias */}
                <Section style={{ marginTop: 32 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <Code size={28} color="#dc2626" weight="fill" />
                        <SectionTitle>Tecnologias Utilizadas</SectionTitle>
                    </View>

                    <Card>
                        {tecnologias.map((tech, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                                <Text style={{ fontSize: 20, color: '#dc2626', marginRight: 10 }}>▹</Text>
                                <Text style={{ fontSize: 16, color: '#1e293b' }}>{tech}</Text>
                            </View>
                        ))}
                    </Card>
                </Section>

                {/* Suporte */}
                <Section style={{ marginTop: 32, marginBottom: 40 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <Wrench size={28} color="#dc2626" weight="fill" />
                        <SectionTitle>Suporte</SectionTitle>
                    </View>

                    <Card>
                        <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22 }}>
                            Em caso de dúvidas ou sugestões de melhoria, consulte a documentação interna do projeto ou entre em contato com o time desenvolvedor.
                        </Text>
                    </Card>
                </Section>
            </Scroll>
        </Container>
    );
}