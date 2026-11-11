import { clamp } from "./utils.js";

const SUPABASE_URL = "https://fkzplrhldohsjzjsrdpx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_tGjea1sOXH9u2kK9OG4bnQ_6cPxzOVH";

export class GameUI {
  constructor() {
    this.hud = document.querySelector("#hud");
    this.startScreen = document.querySelector("#startScreen");
    this.resultScreen = document.querySelector("#resultScreen");
    this.toastTimer = 0;
    this.toastElement = document.querySelector("#toast");
  }

  bind({ onStart, onRetry, onHome, onSteer, onJump }) {
    document
      .querySelector("#startButton")
      .addEventListener("click", () => onStart());
    document.querySelector("#retryButton").addEventListener("click", onRetry);
    document.querySelector("#homeButton").addEventListener("click", onHome);
    document.querySelector("#scoreModeButton").addEventListener("click", () => {
      document.querySelector("#scoreModeEntry").classList.toggle("hidden");
      document.querySelector("#nickname").focus();
    });
    document.querySelector("#scoreModeStart").addEventListener("click", () => {
      const nickname = document.querySelector("#nickname").value.trim();
      if (!nickname) {
        this.showToast("닉네임을 입력해 주세요.");
        return;
      }
      onStart(nickname);
    });
    document
      .querySelector("#rankingButton")
      .addEventListener("click", async () => {
        const modal = document.querySelector("#rankingModal");
        const rankingElement = document.querySelector("#startRanking");
        modal.classList.remove("hidden");
        rankingElement.innerHTML =
          '<div class="ranking-empty">순위표를 불러오는 중...</div>';
        this.renderRanking(await this.fetchRanking(), "#startRanking");
      });
    document
      .querySelector("#rankingCloseButton")
      .addEventListener("click", () =>
        document.querySelector("#rankingModal").classList.add("hidden"),
      );
    document
      .querySelector("#rankingModal")
      .addEventListener("click", (event) => {
        if (event.target.id === "rankingModal")
          event.currentTarget.classList.add("hidden");
      });
    document
      .querySelector("#leftButton")
      .addEventListener("pointerdown", () => onSteer(-1));
    document
      .querySelector("#rightButton")
      .addEventListener("pointerdown", () => onSteer(1));
    document.querySelectorAll("#leftButton, #rightButton").forEach((button) => {
      button.addEventListener("pointerup", () => onSteer(0));
      button.addEventListener("pointercancel", () => onSteer(0));
      button.addEventListener("pointerleave", () => onSteer(0));
    });
    document
      .querySelector("#jumpButton")
      .addEventListener("pointerdown", onJump);
  }

  showToast(message) {
    this.toastElement.textContent = message;
    this.toastElement.classList.add("show");
    this.toastTimer = 1.45;
  }

  update(dt, ride, cooking, scoreMode = false) {
    document.querySelector("#distance").innerHTML =
      `${Math.floor(ride.distance * 0.65).toLocaleString()} <small>m</small>`;
    document.querySelector("#rideScore").textContent = ride.score;
    document.querySelector("#tasteLabel").textContent = scoreMode
      ? "스팸 상태"
      : "맛 점수";
    document.querySelector("#tasteScore").textContent = scoreMode
      ? `${"♥".repeat(cooking.hearts)}${"♡".repeat(2 - cooking.hearts)}`
      : cooking.score;
    document.querySelector("#progressBar").style.width =
      `${clamp((ride.distance / ride.finishDistance) * 100, 0, 100)}%`;
    const ready = cooking.isGoodFlipTiming();
    document.querySelector("#cookHud").classList.toggle("ready-to-flip", ready);
    document.querySelector("#cookMeter").style.width =
      `${Math.round(cooking.heatLevel * 100)}%`;
    const target = document.querySelector(".cook-target");
    target.style.left = `${(cooking.targetStart / 12) * 100}%`;
    target.style.width = `${((cooking.targetEnd - cooking.targetStart) / 12) * 100}%`;
    document
      .querySelector("#speedLines")
      .classList.toggle("fast", ride.speed > 47);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (this.toastTimer === 0) this.toastElement.classList.remove("show");
  }

  showStart() {
    this.startScreen.classList.remove("hidden");
    this.resultScreen.classList.add("hidden");
    this.hud.classList.remove("active");
  }

  showGame(scoreMode = false) {
    this.startScreen.classList.add("hidden");
    this.resultScreen.classList.add("hidden");
    this.hud.classList.add("active");
    this.hud.classList.toggle("score-mode", scoreMode);
  }

  async showResult(
    ride,
    cooking,
    {
      gameOver = false,
      gameOverReason = "",
      scoreMode = false,
      nickname = "",
    } = {},
  ) {
    this.hud.classList.remove("active");
    this.resultScreen.classList.remove("hidden");
    this.resultScreen
      .querySelector(".result-panel")
      .classList.toggle("game-over", gameOver);
    this.resultScreen
      .querySelector(".result-panel")
      .classList.toggle("score-mode-result", scoreMode);
    document.querySelector("#resultEyebrow").textContent = scoreMode
      ? "무한 모드 · GAME OVER"
      : gameOver
        ? "GAME OVER · 주행 점수 0점"
        : "FINISH LINE";
    document.querySelector("#resultHeading").textContent =
      gameOverReason === "no-flip"
        ? "스팸을 잊지 말아주세요"
        : gameOverReason === "mistakes"
          ? "스팸을 잘못 뒤집었어요"
          : scoreMode
            ? `${nickname}님의 기록`
            : gameOver
              ? "레이스 오버!"
              : "잘했어요!";
    const target = {
      ride: scoreMode ? Math.floor(ride.distance * 0.65) : ride.score,
      taste: scoreMode ? 0 : cooking.score,
    };
    document.querySelector("#finalScoreLabel").textContent = scoreMode
      ? "최종 거리 점수"
      : "최종 점수";
    document.querySelector("#finalTotalLimit").textContent = scoreMode
      ? ""
      : "/ 100";
    document.querySelector(".ride-result span").textContent = scoreMode
      ? "주행 거리 점수"
      : "주행 점수";
    document.querySelector(".ride-result small").textContent = scoreMode
      ? "m"
      : "/ 50";
    const rankingElement = document.querySelector("#ranking");
    const rankingNotice = document.querySelector("#rankingNotice");
    rankingElement.classList.toggle("hidden", !scoreMode);
    rankingNotice.classList.add("hidden");
    if (scoreMode) {
      rankingElement.innerHTML =
        '<strong>TOP 10</strong><div class="ranking-empty">순위표를 불러오는 중...</div>';
      const ranking = await this.saveRanking(nickname, target.ride);
      const rankingIndex = ranking.findIndex(
        (entry) =>
          entry.nickname === nickname.slice(0, 12) &&
          Number(entry.distance) === target.ride,
      );
      this.renderRanking(ranking, "#ranking", rankingIndex);
      if (rankingIndex >= 0) {
        rankingNotice.textContent = `축하합니다! TOP 10 진입 · ${rankingIndex + 1}위 달성`;
        rankingNotice.classList.remove("hidden");
      }
    } else {
      rankingElement.innerHTML = "";
    }
    const started = performance.now();
    document.querySelector("#finalRide").textContent = "0";
    document.querySelector("#finalCook").textContent = "0";
    document.querySelector("#finalTotal").textContent = "0";
    document.querySelector("#resultStars").textContent =
      "★".repeat(cooking.stars) + "☆".repeat(5 - cooking.stars);
    const countUp = (now) => {
      if (this.resultScreen.classList.contains("hidden")) return;
      const progress = clamp((now - started) / 1100, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const rideScore = Math.round(target.ride * eased);
      const tasteScore = Math.round(target.taste * eased);
      document.querySelector("#finalRide").textContent = rideScore;
      document.querySelector("#finalCook").textContent = tasteScore;
      document.querySelector("#finalTotal").textContent =
        rideScore + tasteScore;
      if (progress < 1) requestAnimationFrame(countUp);
    };
    requestAnimationFrame(countUp);
  }

  async saveRanking(nickname, distance) {
    const headers = {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    };
    try {
      const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/rankings`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          nickname: nickname.slice(0, 12),
          distance: Math.max(0, Math.floor(distance)),
        }),
      });
      if (!insertResponse.ok) {
        throw new Error(`ranking insert failed: ${insertResponse.status}`);
      }
      const rankingResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/rankings?select=nickname,distance,created_at&order=distance.desc&limit=10`,
        { headers },
      );
      if (!rankingResponse.ok) {
        throw new Error(`ranking query failed: ${rankingResponse.status}`);
      }
      return await rankingResponse.json();
    } catch (error) {
      console.error("온라인 순위표를 불러오지 못했습니다.", error);
      this.showToast("온라인 순위표를 불러오지 못했어요.");
      return [];
    }
  }

  async fetchRanking() {
    const headers = {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    };
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rankings?select=nickname,distance,created_at&order=distance.desc&limit=10`,
        { headers },
      );
      if (!response.ok)
        throw new Error(`ranking query failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("온라인 순위표를 불러오지 못했습니다.", error);
      this.showToast("온라인 순위표를 불러오지 못했어요.");
      return [];
    }
  }

  renderRanking(ranking, selector = "#ranking", highlightedIndex = -1) {
    const rankingElement = document.querySelector(selector);
    const heading =
      selector === "#startRanking" ? "" : "<strong>TOP 10</strong>";
    rankingElement.innerHTML = `${heading}<div class="ranking-labels"><span>순위</span><span>플레이어</span><span>기록일</span><span>거리</span></div>${
      ranking
        .map(
          (entry, index) =>
            `<div class="ranking-row rank-${index + 1}${index === highlightedIndex ? " current-record" : ""}"><span class="ranking-rank">${index + 1}</span><span class="ranking-name">${this.escapeHtml(entry.nickname)}${index === highlightedIndex ? "<em>내 기록</em>" : ""}</span><time>${this.formatRankingDate(entry.created_at)}</time><b>${entry.distance.toLocaleString()}<small>m</small></b></div>`,
        )
        .join("") || '<div class="ranking-empty">아직 기록이 없습니다.</div>'
    }`;
  }

  escapeHtml(value) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  formatRankingDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}
