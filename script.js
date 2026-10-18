const STORAGE_KEY = "npc_list";
      function carregarNPCs() {
        try {
          const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
          return Array.isArray(dados) ? dados : [];
        } catch (erro) {
          console.error("Não foi possível carregar os NPCs salvos:", erro);
          return [];
        }
      }
      let npcs = carregarNPCs();
      let fichaAtualId = null;
      let editandoId = null;
      let imagemTemp = null;
      let pdAtual = 16;
      let pdMax = 16;

      const imgInput = document.getElementById("imagem");
      const CORES_FUNCAO = {
        Executor: "#ae2c12",
        Analista: "#4176ba",
        Vigilante: "#4c7e2e",
      };
      function corDaFuncao(funcao) { return CORES_FUNCAO[funcao] || "#3e78bb"; }

      imgInput.addEventListener("change", () => {
        const file = imgInput.files[0];
        if (!file) return;

        const img = new Image();
        const reader = new FileReader();

        reader.onload = () => (img.src = reader.result);

        img.onload = () => {
          // Mantém a proporção e uma resolução alta para evitar retratos pixelados.
          // Limita a maior dimensão a 1600 px para equilibrar qualidade e armazenamento.
          const maxSize = 1600;
          const escala = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));

          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          imagemTemp = canvas.toDataURL("image/jpeg", 0.92);
        };

        reader.readAsDataURL(file);
      });

      function save() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(npcs));
          return true;
        } catch (erro) {
          console.error("Não foi possível salvar os NPCs:", erro);
          alert("Não foi possível salvar. O armazenamento do navegador pode estar cheio; tente usar imagens menores.");
          return false;
        }
      }

      function render() {
        const list = document.getElementById("npc-list");
        list.replaceChildren();
        npcs.forEach((n) => {
          const card = document.createElement("div");
          card.className = "npc";
          card.setAttribute("role", "button");
          card.tabIndex = 0;
          card.setAttribute("aria-label", `Abrir ficha de ${n.nome || "NPC"}`);
          card.style.setProperty("--role-color", corDaFuncao(n.funcao));
          card.addEventListener("click", () => openFicha(n.id));
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFicha(n.id);
            }
          });

          const portrait = document.createElement("div");
          portrait.className = "npc-portrait";
          const image = document.createElement("img");
          image.src = n.imagem || "";
          image.alt = `Retrato de ${n.nome || "NPC"}`;
          image.style.objectPosition = `${Number(n.imgX ?? 50)}% ${Number(n.imgY ?? 50)}%`;
          const portraitInfo = document.createElement("div");
          portraitInfo.className = "npc-portrait-info";
          const name = document.createElement("strong");
          name.textContent = n.nome || "Sem nome";
          const type = document.createElement("span");
          type.textContent = n.tipo || "Pessoa";
          portraitInfo.append(name, type);
          portrait.append(image, portraitInfo);

          const info = document.createElement("div");
          info.className = "npc-info";
          const life = document.createElement("div");
          life.className = "npc-meta";
          life.textContent = `Vida ${n.vidaAtual ?? 0}/${n.vidaMax ?? 0}`;
          const role = document.createElement("span");
          role.className = "npc-role-tag";
          role.style.setProperty("--role-color", corDaFuncao(n.funcao));
          role.textContent = n.funcao || "Sem perfil";
          info.append(life, role);
          card.append(portrait, info);
          list.append(card);
        });
      }

      function openFicha(id) {
        const npc = npcs.find((n) => n.id === id);
        if (!npc) return;
        fichaAtualId = id;
        const cor = corDaFuncao(npc.funcao);
        const fichaCard = document.querySelector(".ficha-card");
        fichaCard.style.setProperty("--azul", cor);
        fichaCard.style.setProperty("--azul-claro", cor);
        fichaCard.style.setProperty("--borda-tema", cor);
        fichaCard.style.boxShadow = `0 18px 60px #000a, 0 0 18px ${cor}30`;

        document.getElementById("ficha-img").src = npc.imagem || "";
        document.getElementById(
          "ficha-img"
        ).style.objectPosition = `${npc.imgX}% ${npc.imgY}%`;
        document.getElementById("ficha-nome").innerText = npc.nome;
        document.getElementById("ficha-tipo").innerText = npc.tipo;
        document.getElementById("vidaMax").innerText = npc.vidaMax;
        document.getElementById("ficha-descricao").innerText =
          npc.descricao || "—";

        pdMax = Number(npc.pdMax ?? 16);
        pdAtual = Number(npc.pdAtual ?? pdMax);
        atualizarBarraVida(npc);
        atualizarPD();
        document.getElementById("fichaModal").style.display = "flex";
      }

      function animarValor(id) {
        const el = document.getElementById(id);
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      }

      function alterarVida(v) {
        const npc = npcs.find((n) => n.id === fichaAtualId);
        if (!npc) return;
        npc.vidaAtual = Math.max(0, Math.min(Number(npc.vidaAtual || 0) + v, Number(npc.vidaMax || 0)));
        atualizarBarraVida(npc);
        animarValor("vida-texto");
        save();
      }

      function atualizarBarraVida(npc) {
        document.getElementById("vida-texto").innerText =
          `${npc.vidaAtual}/${npc.vidaMax}`;
        const percentual = npc.vidaMax > 0
          ? Math.max(0, Math.min(100, (npc.vidaAtual / npc.vidaMax) * 100))
          : 0;
        const barra = document.getElementById("vida-barra");
        barra.style.setProperty("--fill", `${percentual}%`);
        barra.setAttribute("aria-valuenow", String(Math.round(percentual)));
      }

      function alterarPD(v) {
        pdAtual = Math.max(0, Math.min(pdAtual + v, pdMax));
        const npc = npcs.find((n) => n.id === fichaAtualId);
        if (npc) { npc.pdAtual = pdAtual; npc.pdMax = pdMax; save(); }
        atualizarPD();
        animarValor("pd-texto");
      }

      function atualizarPD() {
        document.getElementById("pd-texto").innerText = `${pdAtual}/${pdMax}`;
        const percentual = pdMax > 0
          ? Math.max(0, Math.min(100, (pdAtual / pdMax) * 100))
          : 0;
        const barra = document.getElementById("pd-barra");
        barra.style.setProperty("--fill", `${percentual}%`);
        barra.setAttribute("aria-valuenow", String(Math.round(percentual)));
      }


      function fecharFicha() {
        document.getElementById("fichaModal").style.display = "none";
        render();
      }

      function openModal() {
        editandoId = null;
        imagemTemp = null;
        imgInput.value = "";
        nome.value = vida.value = descricao.value = "";
        pdMaxInput.value = 16;
        funcao.value = "";
        imgX.value = imgY.value = 50;
        modal.style.display = "flex";
      }

      function confirmarNPC() {
        const nomeLimpo = nome.value.trim();
        const vidaMaxima = Number(vida.value);
        const pdMaximo = Math.max(0, Number(pdMaxInput.value || 16));
        if (!nomeLimpo || !Number.isFinite(vidaMaxima) || vidaMaxima <= 0) {
          alert("Informe um nome e uma Vida Máxima maior que zero.");
          return;
        }
        if (!Number.isFinite(pdMaximo)) {
          alert("Informe um valor válido para PD Máximo.");
          return;
        }

        if (editandoId) {
          const n = npcs.find((n) => n.id === editandoId);
          Object.assign(n, {
            nome: nomeLimpo,
            vidaMax: vidaMaxima,
            vidaAtual: Math.min(Number(n.vidaAtual ?? vidaMaxima), vidaMaxima),
            pdMax: pdMaximo,
            pdAtual: Math.min(Number(n.pdAtual ?? 16), pdMaximo),
            tipo: tipo.value,
            funcao: funcao.value,
            descricao: descricao.value,
            imagem: imagemTemp || n.imagem,
            imgX: imgX.value,
            imgY: imgY.value,
          });
        } else {
          npcs.push({
            id: crypto.randomUUID(),
            nome: nomeLimpo,
            vidaAtual: vidaMaxima,
            vidaMax: vidaMaxima,
            pdAtual: pdMaximo,
            pdMax: pdMaximo,
            funcao: funcao.value,
            tipo: tipo.value,
            descricao: descricao.value,
            imagem: imagemTemp,
            imgX: imgX.value,
            imgY: imgY.value,
          });
        }

        if (!save()) return;
        closeModal();
        render();
      }

      function editarNPC(id = fichaAtualId) {
        const n = npcs.find((n) => n.id === id);
        if (!n) return;
        editandoId = id;

        nome.value = n.nome;
        vida.value = n.vidaMax;
        pdMaxInput.value = n.pdMax ?? 16;
        tipo.value = n.tipo;
        funcao.value = n.funcao || "";
        descricao.value = n.descricao;
        imgX.value = n.imgX ?? 50;
        imgY.value = n.imgY ?? 50;
        imgInput.value = "";
        imagemTemp = n.imagem;

        fecharFicha();
        modal.style.display = "flex";
      }

      function alterarFuncao(id, funcao) {
        const npc = npcs.find((n) => n.id === id);
        if (!npc) return;
        npc.funcao = funcao;
        save();
        render();
        if (fichaAtualId === id) {
          const cor = corDaFuncao(funcao);
          const card = document.querySelector(".ficha-card");
          card.style.setProperty("--azul", cor);
          card.style.setProperty("--azul-claro", cor);
          card.style.setProperty("--borda-tema", cor);
          card.style.boxShadow = `0 18px 60px #000a, 0 0 18px ${cor}30`;
        }
      }

      function removerNPC(id) {
        const npc = npcs.find((n) => n.id === id);
        if (!npc) return;
        if (!confirm(`Tem certeza de que deseja remover ${npc.nome}? Essa ação não pode ser desfeita.`)) return;
        npcs = npcs.filter((n) => n.id !== id);
        save();
        document.getElementById("fichaModal").style.display = "none";
        fichaAtualId = null;
        render();
      }

      function closeModal() {
        modal.style.display = "none";
      }

      render();
