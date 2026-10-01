# mic-live

按一下就聽到麥克風的聲音，再按一下暫停。沒有畫面、沒有錄音、不會上傳。

給長輩用的版本：字大、按鈕大、用語白話，設定記在瀏覽器裡，關掉再開也不會不見。

## 用法

1. 用電腦或手機打開網頁（[線上版](https://github.com/ChiuHuang/mic-live)）。
2. 按中間那顆大按鈕，第一次會問你要麥克風權限，選「允許」。
3. 再按一下就暫停。

**請戴耳機。** 不戴耳機的話麥克風會聽到自己發出的聲音，然後尖叫。

網址必須是 `https://` 或 `http://localhost`，瀏覽器才會給麥克風權限（`file://` 不行）。

## 設定

右上角的齒輪。每一項都會即時生效，並存在瀏覽器的 localStorage（鍵名 `mic-live.settings.v1`），不用按儲存。

| 項目 | 說明 |
| --- | --- |
| 聲音大小 | 喇叭出來的大小，0 到 150% |
| 麥克風靈敏度 | 麥克風太小聲時調高，0 到 200% |
| 使用哪個麥克風 | 麥克風超過一個時可以選；沒拿到麥克風權限前只能看到「麥克風 1、2…」 |
| 沒人講話時自動靜音 | 音量低於 -55 dB 就把輸出關掉，有人說話再打開 |
| 顯示音量條 | 在按鈕下面顯示一條音量條 |
| 畫面顏色 | 跟著系統 / 淺色 / 深色 |
| 還原成預設值 | 把上面全部改回預設 |

存壞掉的 localStorage（例如有人手改成 `"master":"loud"`）不會讓頁面壞掉，會安靜地退回預設值。

## 音訊怎麼接的

```
MediaStreamSource -> 麥克風靈敏度 -> AnalyserNode -> 自動靜音 -> 聲音大小 -> 喇叭
```

- 中間沒有任何 buffer 或工作佇列，延遲就是瀏覽器音訊堆疊的延遲（桌機約 10-30 ms）。
- `echoCancellation` / `noiseSuppression` / `autoGainControl` 全部關掉，監聽自己時這三個只會礙事。
- 音量計用 `getFloatTimeDomainData` 而不是 byte 版，byte 版在 -48 dB 以下會全部變成 0。
- 暫停時不丟掉 stream，只把音量降到 0 並讓 track 停止收音，所以恢復時不會再跳一次權限提示。
- 關掉分頁（`pagehide`）會 `track.stop()` 把麥克風還回去，不然麥克風的指示燈會一直亮著。

## 本地跑

```powershell
cd C:\Projects\mic-live
python -m http.server 8080
```

開 <http://localhost:8080/>。

## 目錄

```
index.html          整個網站，單一檔案
vendor/mdui.css     mdui 2.1.5（MIT）
vendor/mdui.global.js
```

mdui 直接放在 `vendor/`，不連 CDN，也不需要圖示字型：按鈕圖示是內嵌 SVG，
`mdui-switch` 和 `mdui-select` 的內建圖示都傳空字串拿掉，所以沒有字型載入失敗就變成
一串英文的問題。

## 授權與出處

- [mdui](https://github.com/xx025/mdui) 2.1.5，MIT License，`vendor/` 底下兩個檔案是它的建置結果。
- 按鈕的圖示是 Material Design 圖形的 SVG 路徑（Apache License 2.0）。
