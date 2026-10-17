const STORAGE_KEY = "npc_list";
      let npcs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(npcs));
      }

      function render() {
        const list = document.getElementById("npc-list");
        list.innerHTML = "";

        npcs.forEach((n) => {
          list.innerHTML += `
          <div class="npc" role="button" tabindex="0" aria-label="Abrir ficha de ${n.nome}" onclick="openFicha('${n.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openFicha('${n.id}') }" style="--role-color:${corDaFuncao(n.funcao)}">
            <div class="npc-portrait">
              <img src="${n.imagem || ""}" alt="Retrato de ${n.nome}" style="object-position:${n.imgX}% ${n.imgY}%">
              <div class="npc-portrait-info">
                <strong>${n.nome}</strong>
                <span>${n.tipo || "Pessoa"}</span>
              </div>
            </div>
            <div class="npc-info">
              <div class="npc-meta">Vida ${n.vidaAtual}/${n.vidaMax}</div>
              <span class="npc-role-tag" style="--role-color:${corDaFuncao(n.funcao)}">${n.funcao || "Sem perfil"}</span>
            </div>
          </div>`;
        });
      }

      function openFicha(id) {
        const npc = npcs.find((n) => n.id === id);
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
        npc.vidaAtual = Math.max(0, Math.min(npc.vidaAtual + v, npc.vidaMax));
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
        nome.value = vida.value = descricao.value = "";
        pdMaxInput.value = 16;
        funcao.value = "";
        imgX.value = imgY.value = 50;
        modal.style.display = "flex";
      }

      function confirmarNPC() {
        if (!nome.value || vida.value <= 0) return;

        if (editandoId) {
          const n = npcs.find((n) => n.id === editandoId);
          Object.assign(n, {
            nome: nome.value,
            vidaMax: +vida.value,
            vidaAtual: Math.min(n.vidaAtual, vida.value),
            pdMax: Math.max(0, Number(pdMaxInput.value || 16)),
            pdAtual: Math.min(Number(n.pdAtual ?? 16), Math.max(0, Number(pdMaxInput.value || 16))),
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
            nome: nome.value,
            vidaAtual: +vida.value,
            vidaMax: +vida.value,
            pdAtual: Math.max(0, Number(pdMaxInput.value || 16)),
            pdMax: Math.max(0, Number(pdMaxInput.value || 16)),
            funcao: funcao.value,
            tipo: tipo.value,
            descricao: descricao.value,
            imagem: imagemTemp,
            imgX: imgX.value,
            imgY: imgY.value,
          });
        }

        save();
        closeModal();
        render();
      }

      function editarNPC(id = fichaAtualId) {
        const n = npcs.find((n) => n.id === id);
        editandoId = id;

        nome.value = n.nome;
        vida.value = n.vidaMax;
        pdMaxInput.value = n.pdMax ?? 16;
        tipo.value = n.tipo;
        funcao.value = n.funcao || "";
        descricao.value = n.descricao;
        imgX.value = n.imgX;
        imgY.value = n.imgY;
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
