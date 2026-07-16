import { useState, useEffect, useRef, useCallback } from "react";

const DIFFICULTIES = [
  { label: "3×3", size: 3 },
  { label: "4×4", size: 4 },
  { label: "5×5", size: 5 },
];

function App() {
  const [gridSize, setGridSize] = useState(3);
  const [image, setImage] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [emptyIndex, setEmptyIndex] = useState(0);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [showWinCard, setShowWinCard] = useState(false);
  const [defaultImgFailed, setDefaultImgFailed] = useState(false);
  const [tileImages, setTileImages] = useState([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const timerRef = useRef(null);
  const winCardTimerRef = useRef(null);
  const userChoseImageRef = useRef(false);
  const defaultImgTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const gameRef = useRef(null);

  // Generate tile images from uploaded image
  const generateTileImages = useCallback((img, size) => {
    const totalTiles = size * size;
    const images = [];
    const tileSize = 400;
    const srcTileW = img.width / size;
    const srcTileH = img.height / size;

    for (let i = 0; i < totalTiles; i++) {
      const row = Math.floor(i / size);
      const col = i % size;
      const canvas = document.createElement("canvas");
      canvas.width = tileSize / size;
      canvas.height = tileSize / size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        img,
        col * srcTileW,
        row * srcTileH,
        srcTileW,
        srcTileH,
        0,
        0,
        canvas.width,
        canvas.height
      );
      images.push(canvas.toDataURL());
    }
    return images;
  }, []);

  // Check if puzzle is solved
  const checkSolved = useCallback((currentTiles, size) => {
    const total = size * size;
    for (let i = 0; i < total - 1; i++) {
      if (currentTiles[i] !== i + 1) return false;
    }
    return currentTiles[total - 1] === 0;
  }, []);

  // Shuffle with guaranteed solvability (simulate random moves from solved state)
  const shuffleTiles = useCallback((size) => {
    const total = size * size;
    let arr = Array.from({ length: total }, (_, i) => (i + 1) % total);
    let empty = total - 1;

    const getNeighbors = (idx) => {
      const neighbors = [];
      const row = Math.floor(idx / size);
      const col = idx % size;
      if (row > 0) neighbors.push(idx - size);
      if (row < size - 1) neighbors.push(idx + size);
      if (col > 0) neighbors.push(idx - 1);
      if (col < size - 1) neighbors.push(idx + 1);
      return neighbors;
    };

    const shuffleMoves = size * size * 80;
    let lastEmpty = -1;
    for (let i = 0; i < shuffleMoves; i++) {
      const neighbors = getNeighbors(empty).filter((n) => n !== lastEmpty);
      const randomNeighbor =
        neighbors[Math.floor(Math.random() * neighbors.length)];
      arr[empty] = arr[randomNeighbor];
      arr[randomNeighbor] = 0;
      lastEmpty = empty;
      empty = randomNeighbor;
    }

    return { tiles: arr, emptyIdx: empty };
  }, []);

  // Start new game
  const startGame = useCallback(() => {
    if (!image) return;
    const { tiles: newTiles, emptyIdx } = shuffleTiles(gridSize);
    setTiles(newTiles);
    setEmptyIndex(emptyIdx);
    setMoves(0);
    setTime(0);
    setIsPlaying(true);
    setIsSolved(false);
    setShowWinCard(false);
    if (winCardTimerRef.current) clearTimeout(winCardTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    setTimeout(() => gameRef.current?.focus(), 100);
  }, [image, gridSize, shuffleTiles]);

  // Handle tile click
  const moveTile = useCallback(
    (clickedIndex) => {
      if (!isPlaying || isSolved) return;
      const row = Math.floor(clickedIndex / gridSize);
      const col = clickedIndex % gridSize;
      const emptyRow = Math.floor(emptyIndex / gridSize);
      const emptyCol = emptyIndex % gridSize;

      const isAdjacent =
        (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
        (Math.abs(col - emptyCol) === 1 && row === emptyRow);

      if (!isAdjacent) return;

      const newTiles = [...tiles];
      newTiles[emptyIndex] = newTiles[clickedIndex];
      newTiles[clickedIndex] = 0;
      setTiles(newTiles);
      setEmptyIndex(clickedIndex);
      setMoves((m) => m + 1);

      if (checkSolved(newTiles, gridSize)) {
        setIsSolved(true);
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        // Let the player admire the completed image before showing the card.
        if (winCardTimerRef.current) clearTimeout(winCardTimerRef.current);
        winCardTimerRef.current = setTimeout(() => setShowWinCard(true), 1800);
      }
    },
    [isPlaying, isSolved, tiles, emptyIndex, gridSize, checkSolved]
  );

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e) => {
      if (!isPlaying || isSolved) return;
      const emptyRow = Math.floor(emptyIndex / gridSize);
      const emptyCol = emptyIndex % gridSize;
      let targetIndex = -1;

      switch (e.key) {
        case "ArrowUp":
          if (emptyRow < gridSize - 1) targetIndex = emptyIndex + gridSize;
          break;
        case "ArrowDown":
          if (emptyRow > 0) targetIndex = emptyIndex - gridSize;
          break;
        case "ArrowLeft":
          if (emptyCol < gridSize - 1) targetIndex = emptyIndex + 1;
          break;
        case "ArrowRight":
          if (emptyCol > 0) targetIndex = emptyIndex - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      if (targetIndex >= 0) moveTile(targetIndex);
    },
    [isPlaying, isSolved, emptyIndex, gridSize, moveTile]
  );

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Mark that the user has chosen their own image FIRST (synchronously), so
    // any still-downloading default image can no longer overwrite it, and stop
    // any pending default-image retry.
    userChoseImageRef.current = true;
    if (defaultImgTimerRef.current) clearTimeout(defaultImgTimerRef.current);
    setDefaultImgFailed(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setPreviewImage(ev.target.result);
        setTileImages(generateTileImages(img, gridSize));
        setIsPlaying(false);
        setIsSolved(false);
        setShowWinCard(false);
        setTiles([]);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      img.onerror = () => {
        alert("图片加载失败，请换一张图片试试");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Load default image on mount (guarded against races + with retry)
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 3;

    const tryLoad = () => {
      // Never overwrite a user-chosen image, and stop if unmounted.
      if (cancelled || userChoseImageRef.current) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled || userChoseImageRef.current) return;
        setImage(img);
        setPreviewImage("/cute-kitten.jpg");
        setTileImages(generateTileImages(img, gridSize));
        setDefaultImgFailed(false);
      };
      img.onerror = () => {
        if (cancelled || userChoseImageRef.current) return;
        attempt += 1;
        if (attempt < maxAttempts) {
          defaultImgTimerRef.current = setTimeout(tryLoad, 800 * attempt);
        } else {
          setDefaultImgFailed(true);
        }
      };
      // Cache-bust on retries to avoid a cached failed/partial response.
      img.src = attempt === 0 ? "/cute-kitten.jpg" : `/cute-kitten.jpg?r=${attempt}`;
    };

    tryLoad();

    return () => {
      cancelled = true;
      if (defaultImgTimerRef.current) clearTimeout(defaultImgTimerRef.current);
    };
    // Run once on mount; grid-size changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate tile images when grid size changes
  useEffect(() => {
    if (image) {
      setTileImages(generateTileImages(image, gridSize));
      setIsPlaying(false);
      setIsSolved(false);
      setShowWinCard(false);
      setTiles([]);
      setMoves(0);
      setTime(0);
      if (winCardTimerRef.current) clearTimeout(winCardTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gridSize, image, generateTileImages]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (winCardTimerRef.current) clearTimeout(winCardTimerRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const tileGap = 2;
  const boardSize = 400;
  const tileSize = (boardSize - tileGap * (gridSize + 1)) / gridSize;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-wide">
        滑块拼图
      </h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-center mb-6">
        {/* Difficulty */}
        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.size}
              onClick={() => setGridSize(d.size)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                gridSize === d.size
                  ? "bg-purple-500 text-white shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all shadow-lg"
        >
          上传图片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Start */}
        {image && (
          <button
            onClick={startGame}
            className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-all shadow-lg"
          >
            {tiles.length ? "重新开始" : "开始游戏"}
          </button>
        )}

        {/* Toggle numbers */}
        {isPlaying && (
          <button
            onClick={() => setShowNumbers((s) => !s)}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-all"
          >
            {showNumbers ? "隐藏编号" : "显示编号"}
          </button>
        )}
      </div>

      {/* Stats */}
      {(isPlaying || isSolved) && (
        <div className="flex gap-6 mb-4 text-white/90">
          <div className="text-center">
            <div className="text-xs text-white/50 uppercase tracking-wider">
              步数
            </div>
            <div className="text-xl font-mono font-bold">{moves}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/50 uppercase tracking-wider">
              时间
            </div>
            <div className="text-xl font-mono font-bold">{formatTime(time)}</div>
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="relative">
        {!image && (
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-white/30 rounded-2xl bg-white/5 cursor-pointer hover:bg-white/10 transition-all"
            style={{ width: boardSize, height: boardSize }}
            onClick={() => fileInputRef.current?.click()}
          >
            {defaultImgFailed ? (
              <>
                <svg
                  className="w-16 h-16 text-white/40 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-white/60 text-sm">默认图片加载失败</p>
                <p className="text-white/40 text-xs mt-1">点击上传一张图片开始游戏</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 mb-3 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
                <p className="text-white/50 text-sm">默认图片加载中…</p>
                <p className="text-white/40 text-xs mt-1">也可点击这里上传自己的图片</p>
              </>
            )}
          </div>
        )}

        {image && tiles.length === 0 && (
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: boardSize, height: boardSize }}
          >
            <img
              src={previewImage}
              alt="preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <p className="text-white text-lg font-medium">
                点击"开始游戏"打乱拼图
              </p>
            </div>
          </div>
        )}

        {tiles.length > 0 && (
          <div
            ref={gameRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="relative rounded-2xl overflow-hidden shadow-2xl outline-none ring-2 ring-purple-500/50 focus:ring-purple-400"
            style={{
              width: boardSize,
              height: boardSize,
              background: "#1a1a2e",
              padding: tileGap,
            }}
          >
            {tiles.map((tile, index) => {
              const row = Math.floor(index / gridSize);
              const col = index % gridSize;
              const x = col * (tileSize + tileGap) + tileGap;
              const y = row * (tileSize + tileGap) + tileGap;

              // The empty slot: once solved, fill it with its piece so the
              // completed picture is shown in full.
              if (tile === 0) {
                if (!isSolved) return null;
                return (
                  <div
                    key="last-piece"
                    className="absolute rounded-lg overflow-hidden shadow-md"
                    style={{
                      width: tileSize,
                      height: tileSize,
                      left: x,
                      top: y,
                      backgroundImage: `url(${tileImages[gridSize * gridSize - 1]})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      animation: "fadeInPiece 0.6s ease",
                    }}
                  />
                );
              }

              return (
                <div
                  key={tile}
                  onClick={() => moveTile(index)}
                  className="absolute cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95"
                  style={{
                    width: tileSize,
                    height: tileSize,
                    left: x,
                    top: y,
                    transition:
                      "left 0.15s ease, top 0.15s ease, transform 0.1s ease",
                    backgroundImage: `url(${tileImages[tile - 1]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {showNumbers && (
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {tile}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Win badge — appears immediately, does not obscure the picture */}
            {isSolved && (
              <div
                className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-green-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg"
                style={{ animation: "fadeInPiece 0.4s ease" }}
              >
                <span>✓</span>
                <span>完成</span>
              </div>
            )}

            {/* Delayed congratulations banner — only covers the bottom strip */}
            {showWinCard && (
              <div
                className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 px-4 pt-10 pb-4 rounded-b-2xl"
                style={{
                  background:
                    "linear-gradient(to top, rgba(20,20,46,0.92) 30%, rgba(20,20,46,0.6) 70%, rgba(20,20,46,0))",
                  animation: "slideUpCard 0.5s ease",
                }}
              >
                <p className="text-white text-lg font-bold">🎉 恭喜完成！</p>
                <p className="text-white/70 text-xs mb-2">
                  用了 {moves} 步，耗时 {formatTime(time)}
                </p>
                <button
                  onClick={startGame}
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all shadow-lg"
                >
                  再来一局
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reference image */}
      {isPlaying && previewImage && (
        <div className="mt-4 opacity-70 hover:opacity-100 transition-opacity">
          <p className="text-white/50 text-xs text-center mb-1">参考图</p>
          <img
            src={previewImage}
            alt="reference"
            className="w-24 h-24 object-cover rounded-lg border border-white/20"
          />
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-white/40 text-xs text-center max-w-sm">
        点击相邻滑块或使用方向键移动 · 将图片复原即为胜利
      </div>
    </div>
  );
}

export default App;
