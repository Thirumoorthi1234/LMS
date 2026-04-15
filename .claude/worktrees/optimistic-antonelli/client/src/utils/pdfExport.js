import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../assets/logo.png';

export const generatePayslip = (payroll) => {
    try {
        if (!payroll) throw new Error('Payroll data is missing');

        const doc = new jsPDF();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Header
        // Use Logo Image
        try {
            doc.addImage(logoImg, 'PNG', 14, 12, 50, 15);
        } catch (imgError) {
            console.warn('Could not load logo image for PDF:', imgError);
            // Fallback to text if image fails
            doc.setFontSize(18);
            doc.setTextColor(111, 66, 192);
            doc.text('Learnlike', 14, 22);
        }

        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('PAYSLIP', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        doc.text(`Period: ${months[payroll.month - 1]} ${payroll.year}`, 105, 26, { align: 'center' });

        // Employee Details
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text('Employee Details', 14, 45);
        doc.setFont(undefined, 'normal');
        doc.line(14, 47, 60, 47);

        doc.setFontSize(10);
        const employeeName = payroll.userId?.name || 'N/A';
        doc.text(`Name: ${employeeName}`, 14, 55);
        doc.text(`Employee ID: ${payroll.userId?.employeeId || 'N/A'}`, 14, 62);
        doc.text(`Position: ${payroll.userId?.position || 'N/A'}`, 14, 69);
        doc.text(`Department: ${payroll.userId?.department || 'N/A'}`, 14, 76);
        doc.text(`PF Number (PSF): Not Specified`, 14, 83); // Addressing "thepsf" mention

        // Payment Info
        doc.text(`Status: ${payroll.status}`, 140, 55);
        if (payroll.paidAt) {
            doc.text(`Paid Date: ${new Date(payroll.paidAt).toLocaleDateString()}`, 140, 62);
        }

        // Salary Table
        const tableData = [
            ['Description', 'Earnings', 'Deductions'],
            ['Base Salary', `INR ${payroll.baseSalary.toLocaleString()}`, ''],
            ['HRA Allowance', `INR ${payroll.allowances.hra.toLocaleString()}`, ''],
            ['Transport Allowance', `INR ${payroll.allowances.transport.toLocaleString()}`, ''],
            ['Other Allowances', `INR ${payroll.allowances.other.toLocaleString()}`, ''],
            ['PF (Provident Fund)', '', `INR ${payroll.deductions.pf.toLocaleString()}`],
            ['Income Tax', '', `INR ${payroll.deductions.tax.toLocaleString()}`],
            ['Loss of Pay (LOP)', '', `INR ${payroll.deductions.lop.toLocaleString()}`],
        ];

        autoTable(doc, {
            startY: 95,
            head: [tableData[0]],
            body: tableData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [111, 66, 192] }, // Match branding color
            styles: { fontSize: 10, cellPadding: 5 }
        });

        // Summary
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Earnings: INR ${(payroll.baseSalary + payroll.allowances.hra + payroll.allowances.transport + payroll.allowances.other).toLocaleString()}`, 14, finalY);

        doc.setTextColor(200, 0, 0);
        doc.text(`Total Deductions: INR ${(payroll.deductions.pf + payroll.deductions.tax + payroll.deductions.lop).toLocaleString()}`, 14, finalY + 8);

        doc.setTextColor(0, 128, 0);
        doc.setFontSize(16);
        doc.text(`Net Salary: INR ${payroll.netSalary.toLocaleString()}`, 14, finalY + 22);

        // Footer
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(150);
        doc.text('This is a computer-generated payslip and does not require a physical signature.', 105, 285, { align: 'center' });

        const fileName = `Payslip_${employeeName.replace(/\s+/g, '_')}_${months[payroll.month - 1]}_${payroll.year}.pdf`;
        doc.save(fileName);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Failed to download PDF. Please check the console for errors.');
    }
};
