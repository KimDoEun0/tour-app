import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set, remove, onValue } from "firebase/database";
import "./App.css";

// 공공데이터포털 [일반 인증키 (Encoding)] 입력
const SERVICE_KEY = "8df9681b1748b09a3badc6afff5e72bf6fba7f96507b697945782d3dcf7c4041";

const AREA_CODES = [
  { code: "1", name: "서울" },
  { code: "2", name: "인천" },
  { code: "3", name: "대전" },
  { code: "4", name: "대구" },
  { code: "5", name: "광주" },
  { code: "6", name: "부산" },
  { code: "7", name: "울산" },
  { code: "8", name: "세종" },
  { code: "31", name: "경기" },
  { code: "32", name: "강원" },
  { code: "33", name: "충북" },
  { code: "34", name: "충남" },
  { code: "35", name: "경북" },
  { code: "36", name: "경남" },
  { code: "37", name: "전북" },
  { code: "38", name: "전남" },
  { code: "39", name: "제주" },
];

function App() {
  const [areaCode, setAreaCode] = useState("1");
  const [tourList, setTourList] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [viewMode, setViewMode] = useState("all");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const favoritesRef = ref(db, "favorites");
    const unsubscribe = onValue(favoritesRef, (snapshot) => {
      const data = snapshot.val() || {};
      setFavorites(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchTourData(areaCode);
  }, [areaCode]);

  const fetchTourData = async (code) => {
    setLoading(true);
    setErrorMsg("");

    // 프록시 없이 공공데이터포털 HTTPS 직접 호출
    const url = `https://apis.data.go.kr/B551011/KorService2/areaBasedList2?serviceKey=${SERVICE_KEY}&numOfRows=20&pageNo=1&MobileOS=ETC&MobileApp=TourReactApp&_type=json&areaCode=${code}&arrange=O`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`네트워크 응답 오류 (HTTP ${response.status})`);
      }

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("API가 JSON이 아닌 오류 메시지를 반환했습니다. 인증키(Encoding)를 확인해주세요.");
      }

      if (json.OpenAPI_ServiceResponse) {
        const header = json.OpenAPI_ServiceResponse.cmmMsgHeader;
        throw new Error(`API 오류 [${header?.errMsg}]: ${header?.returnAuthMsg}`);
      }

      const items = json.response?.body?.items?.item || [];
      const normalizedList = Array.isArray(items) ? items : [items];
      setTourList(normalizedList);
    } catch (err) {
      console.error("관광정보 조회 실패:", err);
      setErrorMsg(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
      setTourList([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (item) => {
    const contentId = String(item.contentid);
    const targetRef = ref(db, `favorites/${contentId}`);

    if (favorites[contentId]) {
      remove(targetRef);
    } else {
      set(targetRef, {
        contentid: contentId,
        title: item.title || "명칭 없음",
        addr1: item.addr1 || "주소 정보 없음",
        firstimage: item.firstimage || item.firstimage2 || "",
        savedAt: Date.now()
      });
    }
  };

  const displayList = viewMode === "fav" ? Object.values(favorites) : tourList;

  return (
    <div className="app-container">
      <header className="header">
        <h1>🏞️ 대한민국 지역별 관광지 탐색기</h1>
        <div className="tab-buttons">
          <button
            className={viewMode === "all" ? "active" : ""}
            onClick={() => setViewMode("all")}
          >
            🔍 지역별 조회
          </button>
          <button
            className={viewMode === "fav" ? "active" : ""}
            onClick={() => setViewMode("fav")}
          >
            ❤️ 찜 보관함 ({Object.keys(favorites).length})
          </button>
        </div>
      </header>

      {viewMode === "all" && (
        <section className="filter-section">
          <label htmlFor="area-select">조회할 지역 선택: </label>
          <select
            id="area-select"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
          >
            {AREA_CODES.map((area) => (
              <option key={area.code} value={area.code}>
                {area.name}
              </option>
            ))}
          </select>
        </section>
      )}

      {loading ? (
        <div className="status-message">관광지 정보를 불러오는 중입니다...</div>
      ) : errorMsg ? (
        <div className="status-message error">⚠️ {errorMsg}</div>
      ) : displayList.length === 0 ? (
        <div className="status-message">
          {viewMode === "fav"
            ? "보관함에 찜한 관광지가 없습니다. 하트를 눌러 추가해보세요!"
            : "해당 지역의 조회된 관광 정보가 없습니다."}
        </div>
      ) : (
        <main className="card-grid">
          {displayList.map((item) => {
            const isFav = !!favorites[String(item.contentid)];
            const rawImg = item.firstimage || item.firstimage2 || "";
            const imageUrl = rawImg
              ? rawImg.replace(/^http:\/\//i, "https://")
              : "https://via.placeholder.com/400x260?text=No+Image";

            return (
              <article
                key={item.contentid}
                className={`tour-card ${isFav ? "card-fav" : ""}`}
                onClick={() => toggleFavorite(item)}
                title="클릭하여 찜하기 / 찜 취소"
              >
                <div className="image-wrapper">
                  <img
                    src={imageUrl}
                    alt={item.title}
                    className="tour-image"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/400x260?text=Image+Error";
                    }}
                  />
                  <button
                    type="button"
                    className="fav-badge"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item);
                    }}
                  >
                    {isFav ? "❤️ 찜됨" : "🤍 찜하기"}
                  </button>
                </div>

                <div className="card-content">
                  <h2 className="tour-title">{item.title}</h2>
                  <p className="tour-addr">📍 {item.addr1 || "주소 정보 없음"}</p>
                </div>
              </article>
            );
          })}
        </main>
      )}
    </div>
  );
}

export default App;