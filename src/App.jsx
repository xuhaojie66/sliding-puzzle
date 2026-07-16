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
  const [tileImages, setTileImages] = useState([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const gameRef = useRef(null);

  // Generate tile images from uploaded image
  const generateTileImages = useCallback((img, size) => {
    const totalTiles = size * size;
    const images = [];
    const tileSize = 400;
    const srcTileW = img.width / size;
    const srcTileH = img.height / size;

    for (let i = 0; i < totalTiles - 1; i++) {
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setPreviewImage(ev.target.result);
        setTileImages(generateTileImages(img, gridSize));
        setIsPlaying(false);
        setIsSolved(false);
        setTiles([]);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Load default image on mount
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setPreviewImage("/cute-kitten.png");
      setTileImages(generateTileImages(img, gridSize));
    };
    img.src = "/cute-kitten.png";
  }, []);

  // Regenerate tile images when grid size changes
  useEffect(() => {
    if (image) {
      setTileImages(generateTileImages(image, gridSize));
      setIsPlaying(false);
      setIsSolved(false);
      setTiles([]);
      setMoves(0);
      setTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gridSize, image, generateTileImages]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
            <p className="text-white/50 text-sm">点击上传图片开始游戏</p>
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
              if (tile === 0) return null;
              const row = Math.floor(index / gridSize);
              const col = index % gridSize;
              const x = col * (tileSize + tileGap) + tileGap;
              const y = row * (tileSize + tileGap) + tileGap;

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

            {/* Win overlay */}
            {isSolved && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm z-10">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-white text-xl font-bold mb-1">恭喜完成！</p>
                <p className="text-white/70 text-sm">
                  用了 {moves} 步，耗时 {formatTime(time)}
                </p>
                <button
                  onClick={startGame}
                  className="mt-4 px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all"
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
