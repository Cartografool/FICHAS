# FICHAS — Owlbear Rodeo + Supabase

## O que esta versão faz
- Exige abertura dentro de uma sala do Owlbear Rodeo e verifica se o usuário é GM.
- Exige login Supabase com o e-mail autorizado em `auth-config.js`.
- Carrega e salva as fichas na tabela privada `public.fichas_npc`.
- Na primeira conexão, se ainda não existir registro no banco, migra automaticamente a lista `npc_list` do armazenamento local desse navegador.
- Mantém exportação/importação JSON e uma cópia local de segurança.

## Configuração antes de publicar
1. Abra `auth-config.js`.
2. Substitua `COLOQUE-SEU-EMAIL-AQUI` pelo mesmo e-mail do usuário criado em Supabase > Authentication > Users.
3. Não coloque senha, Secret key ou `service_role` nesse arquivo. A Publishable Key pode ficar no frontend porque o acesso aos dados é protegido por RLS.
4. Publique os arquivos na raiz do repositório GitHub Pages, preservando as pastas `assets` e os arquivos `auth-config.js`, `auth-gate.js`, `script.js`, `style.css`, `index.html` e `manifest.json`.
5. No Owlbear Rodeo, adicione a extensão usando `https://cartografool.github.io/FICHAS/manifest.json`.

## Banco de dados
Esta versão espera a tabela `public.fichas_npc` com colunas `user_id` (UUID, chave primária e referência a `auth.users.id`), `npcs` (JSONB) e `updated_at` (TIMESTAMPTZ), com RLS ativado e políticas de SELECT/INSERT/UPDATE/DELETE que comparem `auth.uid()` com `user_id`. A configuração SQL executada anteriormente pelo usuário cria essa estrutura.

## Migração de dados antigos
Se o registro ainda não existir no Supabase, o primeiro login no navegador onde as fichas antigas estão salvas copia automaticamente o conteúdo de `localStorage` (`npc_list`) para a tabela. Se as fichas antigas estiverem em outro navegador/dispositivo, exporte-as pelo app antigo e importe o JSON depois de entrar na extensão; a importação sincroniza para o banco.

## Observações de segurança
- O cadastro público deve permanecer desativado no Supabase.
- As políticas RLS do banco são a proteção real dos dados; o bloqueio de GM e a conferência do e-mail são camadas adicionais no frontend.
- Não compartilhe a senha da conta nem crie uma Secret key no frontend.
- O site público antigo não deve conter cópias das fichas em arquivos JSON ou código publicado. Os dados privados ficam na tabela Supabase.
