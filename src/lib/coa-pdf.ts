import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type CoaRow = {
  kode_akun: string;
  nama_akun: string;
  tipe_akun: string;
  normal_balance: string;
  is_header: boolean;
  is_active: boolean;
};

export function generateCoaPdf(rows: CoaRow[], opts?: { unitName?: string }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Bagan Akun (Chart of Accounts)", pageWidth / 2, 40, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Kepmendesa No. 136 Tahun 2022", pageWidth / 2, 56, { align: "center" });
  if (opts?.unitName) {
    doc.text(opts.unitName, pageWidth / 2, 70, { align: "center" });
  }
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Dicetak: ${now}  •  Total: ${rows.length} akun`, pageWidth / 2, opts?.unitName ? 84 : 70, { align: "center" });
  doc.setTextColor(0);

  const sorted = [...rows].sort((a, b) => a.kode_akun.localeCompare(b.kode_akun));

  autoTable(doc, {
    startY: opts?.unitName ? 96 : 82,
    head: [["Kode", "Nama Akun", "Tipe", "Saldo Normal", "Jenis", "Status"]],
    body: sorted.map((r) => [
      r.kode_akun,
      r.nama_akun,
      r.tipe_akun,
      r.normal_balance,
      r.is_header ? "Header" : "Detail",
      r.is_active ? "Aktif" : "Nonaktif",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 80, font: "courier" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 70 },
      3: { cellWidth: 70 },
      4: { cellWidth: 50 },
      5: { cellWidth: 55 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && sorted[data.row.index]?.is_header) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
    didDrawPage: () => {
      const str = `Halaman ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(str, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    },
    margin: { top: 96, left: 28, right: 28, bottom: 32 },
  });

  doc.save(`bagan-akun-${new Date().toISOString().slice(0, 10)}.pdf`);
}
