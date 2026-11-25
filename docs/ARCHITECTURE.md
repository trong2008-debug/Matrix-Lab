# Kiến trúc Phần mềm — MatrixLab

## 1. Nguyên tắc phân tách trách nhiệm (Separation of Concerns)

MatrixLab được thiết kế theo kiến trúc phân lớp rõ ràng để tách biệt hoàn toàn **động cơ tính toán toán học** khỏi **tầng giao diện người dùng**:

1. **Tầng Thuật toán (`src/algorithms/`):**
   - Toàn bộ là các hàm TypeScript thuần túy, không nhập `React`, không phụ thuộc DOM, không gọi API bên ngoài.
   - Nhận dữ liệu chuẩn hóa `Scalar[][]` (dạng `Rational` `BigInt` hoặc IEEE-754 `number`) và trả về `CalculationReport` gồm kết quả, ma trận phụ, kiểm chứng sai số dư và danh sách `CalculationStep[]` sinh ra trực tiếp từ quá trình thực thi.
2. **Tầng Dịch vụ (`src/services/`):**
   - `calculation-service/calculationService.ts`: Phân tích dữ liệu thô (`string[][]`), kiểm tra hợp lệ từng ô ma trận, chọn chế độ số học (`auto` / `exact` / `numerical`) và điều phối tới thuật toán tương ứng. Trả về `StructuredMathError` bằng tiếng Việt nếu đầu vào không hợp lệ.
   - `history-service/historyDb.ts`: Lưu trữ cục bộ bằng **IndexedDB** (`matrixlab-db`) cho ba kho lưu trữ: `history` (tối đa 150 bản ghi gần nhất), `matrices` (ma trận đặt tên) và `settings`.
   - `export-service/exporter.ts`: Xuất báo cáo sang LaTeX (`.tex`), CSV (`.csv`), Markdown (`.md`), Văn bản thuần (`.txt`) và PDF (`.pdf` qua Canvas 2D + `jsPDF`).
3. **Tầng Quản lý Trạng thái (`src/store/useMatrixLabStore.ts`):**
   - Sử dụng Zustand quản lý danh sách ma trận đặt tên, vị trí ma trận $A$/$B$, tham số phép toán, báo cáo hiện tại, lịch sử và cài đặt giao diện sáng/tối.
4. **Tầng Giao diện & Hiển thị (`src/components/`, `src/pages/`):**
   - `MatrixEditor`: Trình nhập ma trận độc lập với dấu ngoặc vuông toán học, điều hướng bàn phím, chế độ nhập văn bản và đánh dấu trực tiếp ô lỗi.
   - `StepViewer`: Trình diễn lời giải 3 chế độ (`Chỉ kết quả`, `Tóm tắt`, `Chi tiết`), điều hướng từng bước và làm nổi bật hàng/phần tử trụ.
   - `ResultPanel`: Trình bày báo cáo 8 phần chuẩn học thuật và tích hợp KaTeX (`MathFormula`).

---

## 2. Luồng dữ liệu của một phép tính

```text
Người dùng chỉnh ô ma trận (MatrixEditor)
   └─► Zustand Store (matrices: NamedMatrix[])
         └─► Nhấn "Tính toán" -> runCalculation()
               └─► calculationService.executeCalculation()
                     ├─► resolveComputationMode() -> 'exact' | 'numerical'
                     ├─► parseMatrixRaw() -> phát hiện ô trống / sai định dạng
                     └─► Thuật toán thực thi (echelon / determinant / inverse / eigen...)
                           ├─► Sinh CalculationStep[] từng bước thực
                           ├─► Thực hiện kiểm chứng kết quả (Verification)
                           └─► Trả về CalculationReport
                                 ├─► Cập nhật ResultPanel (KaTeX)
                                 └─► Tự động lưu vào IndexedDB (history)
```

---

## 3. Quy trình xuất PDF hỗ trợ tiếng Việt

Do Tailwind CSS v4 sử dụng hệ màu hiện đại (`oklch`) không tương thích với một số trình chụp DOM cũ, và font mặc định của `jsPDF` không chứa bảng mã tiếng Việt có dấu, MatrixLab sử dụng bộ kết xuất trang **Canvas 2D độ phân giải cao (150 DPI A4)** trong `exporter.ts`:
- Tận dụng trình dựng font chuẩn của trình duyệt để hiển thị 100% dấu tiếng Việt sắc nét.
- Vẽ trực tiếp dấu ngoặc ma trận, vạch phân cách ma trận mở rộng `[A | B]` và căn cột đơn cách (`JetBrains Mono`).
- Đóng gói nhiều trang A4 thành tệp `.pdf` hoàn chỉnh qua `jsPDF` hoàn toàn ngoại tuyến.

---

## 4. Vận hành ngoại tuyến và Bảo mật

- Không có bất kỳ lời gọi mạng hay API AI nào trong luồng tính toán.
- Font và CSS của KaTeX được đóng gói trực tiếp vào bundle qua `import 'katex/dist/katex.min.css'`.
- Không dùng `eval` hay thực thi mã động; dữ liệu nhập được phân tích bằng trình phân tích số học nghiêm ngặt (`parseRational` / `parseScalarToNumber`).
