// File Import Parser (Excel & Word)
window.Parser = {
    // Parse Excel File using SheetJS (XLSX)
    parseExcel(file) {
        return new Promise((resolve, reject) => {
            if (!window.XLSX) {
                reject(new Error("La librería de lectura de Excel (SheetJS) no se ha cargado. Comprueba tu conexión a internet."));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    
                    const parsedNumbers = {};
                    let maxNumberParsed = 100; // Default fallback size
                    
                    // Process sheets. We inspect all sheets. If there's conflict, later sheets overwrite or merge.
                    workbook.SheetNames.forEach((sheetName) => {
                        const worksheet = workbook.Sheets[sheetName];
                        if (!worksheet) return;
                        let rows = [];
                        try {
                            rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                        } catch (sheetErr) {
                            console.warn("Skipping sheet " + sheetName + " due to parse error:", sheetErr);
                            return;
                        }
                        
                        if (!rows || rows.length === 0) return;
                        
                        // Heuristic column detection
                        let numberColIdx = 0;
                        let nameColIdx = 1;
                        let phoneColIdx = 2;
                        let statusColIdx = 3;
                        
                        // Check first few rows for header names
                        let foundHeaders = false;
                        for (let rIdx = 0; rIdx < Math.min(rows.length, 25); rIdx++) {
                            const row = rows[rIdx];
                            if (!row || !Array.isArray(row)) continue;
                            const colsStr = row.map(c => String(c || '').trim().toUpperCase());
                            
                            // Look for headers
                            let numIdx = colsStr.findIndex(c => c.includes("RIFA") || c.includes("TICKET") || c.includes("BOLETO") || c.includes("N°") || c.includes("Nº") || c.includes("NRO") || c.includes("NUMERO") || c.includes("NÚMERO") || c.includes("NUM") || c === "N");
                            const nameIdx = colsStr.findIndex(c => c.includes("NOMBRE") || c.includes("COMPRADOR") || c.includes("NAME") || c.includes("CLIENTE"));
                            let phoneIdx = colsStr.findIndex(c => c.includes("TELEFONO") || c.includes("TELÉFONO") || c.includes("CELULAR") || c.includes("FONO") || c.includes("PHONE"));
                            const statusIdx = colsStr.findIndex(c => c.includes("ESTADO") || c.includes("PAGADO") || c.includes("PAGO") || c.includes("STATUS") || c.includes("DETALLE"));
                            
                            if (numIdx !== -1) {
                                // Verify that this column does not contain phone numbers
                                let isPhoneCol = false;
                                for (let verifyIdx = 0; verifyIdx < Math.min(rows.length, 10); verifyIdx++) {
                                    if (verifyIdx === rIdx) continue; // Skip header row
                                    const verifyRow = rows[verifyIdx];
                                    if (verifyRow && verifyRow[numIdx] !== undefined) {
                                        const verifyVal = String(verifyRow[numIdx]).replace(/[^\d]/g, '');
                                        if (verifyVal.length >= 7) {
                                            isPhoneCol = true;
                                            break;
                                        }
                                    }
                                }
                                if (isPhoneCol) {
                                    if (phoneIdx === -1) {
                                        phoneIdx = numIdx;
                                    }
                                    numIdx = -1;
                                }
                            }

                            if (numIdx !== -1 && nameIdx !== -1) {
                                numberColIdx = numIdx;
                                nameColIdx = nameIdx;
                                if (phoneIdx !== -1) phoneColIdx = phoneIdx;
                                if (statusIdx !== -1) statusColIdx = statusIdx;
                                foundHeaders = true;
                                break;
                            }
                        }

                        // If we didn't find headers explicitly, use statistical type detection!
                        if (!foundHeaders) {
                            const colStats = [];
                            const scanLimit = Math.min(rows.length, 25);
                            for (let rIdx = 0; rIdx < scanLimit; rIdx++) {
                                const row = rows[rIdx];
                                if (!row || !Array.isArray(row)) continue;
                                row.forEach((cell, cIdx) => {
                                    if (!colStats[cIdx]) {
                                        colStats[cIdx] = { ticket: 0, phone: 0, status: 0, name: 0 };
                                    }
                                    const val = String(cell || '').trim();
                                    if (val === '') return;
                                    
                                    const valUpper = val.toUpperCase();
                                    const isStatus = valUpper.includes("PAGADO") || valUpper.includes("EFECTIVO") || valUpper.includes("TRANSFERENCIA") || valUpper.includes("DEPOSITADO") || valUpper.includes("PENDIENTE") || valUpper.includes("DEBE") || valUpper.includes("PAGADA") || valUpper.includes("DEUDORES");
                                    const cleanPhone = val.replace(/[^\d\+]/g, '');
                                    const isPhone = cleanPhone.length >= 7 && cleanPhone.length <= 15 && /^\+?\d+$/.test(cleanPhone);
                                    const cleanNum = val.replace(/[^\d]/g, '');
                                    const isTicket = cleanNum !== '' && parseInt(cleanNum, 10) > 0 && parseInt(cleanNum, 10) <= 5000;
                                    
                                    if (isStatus) colStats[cIdx].status++;
                                    else if (isPhone) colStats[cIdx].phone++;
                                    else if (isTicket) colStats[cIdx].ticket++;
                                    else if (val.length > 2 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.-]+$/.test(val)) colStats[cIdx].name++;
                                });
                            }

                            const assignedCols = new Set();
                            
                            // 1. Ticket Number column
                            let bestTicketCol = -1, maxTicket = 0;
                            colStats.forEach((stats, cIdx) => {
                                if (stats.ticket > maxTicket) { maxTicket = stats.ticket; bestTicketCol = cIdx; }
                            });
                            if (maxTicket > 2) {
                                numberColIdx = bestTicketCol;
                                assignedCols.add(numberColIdx);
                            } else {
                                numberColIdx = -1;
                            }
                            
                            // 2. Buyer Name column
                            let bestNameCol = -1, maxName = 0;
                            colStats.forEach((stats, cIdx) => {
                                if (assignedCols.has(cIdx)) return;
                                if (stats.name > maxName) { maxName = stats.name; bestNameCol = cIdx; }
                            });
                            if (bestNameCol !== -1) {
                                nameColIdx = bestNameCol;
                                assignedCols.add(nameColIdx);
                            } else {
                                nameColIdx = numberColIdx === 1 ? 0 : 1;
                                assignedCols.add(nameColIdx);
                            }
                            
                            // 3. Phone column
                            let bestPhoneCol = -1, maxPhone = 0;
                            colStats.forEach((stats, cIdx) => {
                                if (assignedCols.has(cIdx)) return;
                                if (stats.phone > maxPhone) { maxPhone = stats.phone; bestPhoneCol = cIdx; }
                            });
                            if (bestPhoneCol !== -1) {
                                phoneColIdx = bestPhoneCol;
                                assignedCols.add(phoneColIdx);
                            } else {
                                phoneColIdx = 2;
                                while (assignedCols.has(phoneColIdx) && phoneColIdx < 10) {
                                    phoneColIdx++;
                                }
                                assignedCols.add(phoneColIdx);
                            }
                            
                            // 4. Status column
                            let bestStatusCol = -1, maxStatus = 0;
                            colStats.forEach((stats, cIdx) => {
                                if (assignedCols.has(cIdx)) return;
                                if (stats.status > maxStatus) { maxStatus = stats.status; bestStatusCol = cIdx; }
                            });
                            if (bestStatusCol !== -1) {
                                statusColIdx = bestStatusCol;
                                assignedCols.add(statusColIdx);
                            } else {
                                statusColIdx = 3;
                                while (assignedCols.has(statusColIdx) && statusColIdx < 10) {
                                    statusColIdx++;
                                }
                                assignedCols.add(statusColIdx);
                            }
                        }
                        
                        // Parse rows
                        rows.forEach((row, idx) => {
                            if (!row || !Array.isArray(row)) return;
                            // If we found headers, skip header row
                            if (foundHeaders && idx === 0) return;
                            
                            let num = idx;
                            if (numberColIdx !== -1) {
                                const rawNum = row[numberColIdx];
                                const cleanStr = String(rawNum || '').split(/[\.,]/)[0];
                                num = parseInt(cleanStr.replace(/[^\d]/g, ''), 10);
                            }
                            
                            if (isNaN(num) || num <= 0 || num > 5000) return; // Skip invalid or extremely large numbers (safety cap)
                            
                            let rawName = String(row[nameColIdx] || '').trim();
                            let rawPhone = String(row[phoneColIdx] || '').trim();
                            const rawStatus = String(row[statusColIdx] || '').trim();
                            
                            // Clean up name from inline payment markers (e.g. "Juan OK", "Pedro (PAGADO)")
                            let isPaid = false;
                            const nameUpper = rawName.toUpperCase();
                            if (nameUpper.includes("(PAGADO)") || nameUpper.includes("(OK)") || nameUpper.includes(" PAGADO") || nameUpper.endsWith(" OK")) {
                                isPaid = true;
                                rawName = rawName.replace(/\(pagado\)/i, '')
                                                 .replace(/\(ok\)/i, '')
                                                 .replace(/\s+pagado/i, '')
                                                 .replace(/\s+ok/i, '')
                                                 .trim();
                            }
                            
                            // Extract inline phone numbers next to the name (e.g. "Luis Correa 912345678")
                            const inlinePhoneMatch = rawName.match(/(?:\+?56\s*9?)?\s*\d{8,9}/);
                            if (inlinePhoneMatch && rawPhone === '') {
                                rawPhone = inlinePhoneMatch[0];
                                rawName = rawName.replace(rawPhone, '').replace(/[-\s\(\)]+$/, '').trim();
                            }
                            
                            const isBought = rawName !== '' || rawPhone !== '';
                            
                            // If in sequential mode, only grow size for non-empty (bought) tickets
                            if (numberColIdx !== -1 || isBought) {
                                if (num > maxNumberParsed) {
                                    maxNumberParsed = num;
                                }
                            }
                            
                            if (isBought && rawStatus !== '') {
                                const statusUpper = rawStatus.toUpperCase();
                                // Check if status contains payment indicators (pagado, efectivo, transferencia, ok, si, yes)
                                // and doesn't contain unpaid indicators (no pagado, pendiente, debe, no)
                                const isUnpaidWord = statusUpper.includes("NO") || statusUpper.includes("PENDIENTE") || statusUpper.includes("DEBE") || statusUpper.includes("X");
                                const isPaidWord = statusUpper.includes("PAGADO") || statusUpper.includes("EFECTIVO") || statusUpper.includes("TRANSFERENCIA") || statusUpper.includes("OK") || statusUpper.includes("SI") || statusUpper.includes("SÍ") || statusUpper.includes("YES");
                                
                                if (isPaidWord && !isUnpaidWord) {
                                    isPaid = true;
                                } else if (!isUnpaidWord && statusUpper !== '') {
                                    // Default to paid if status column is filled with positive confirmation
                                    isPaid = true;
                                }
                            }
                            
                            // If number already exists, merge (prioritizing non-empty names)
                            if (parsedNumbers[num]) {
                                const existing = parsedNumbers[num];
                                parsedNumbers[num] = {
                                    number: num,
                                    name: rawName || existing.name,
                                    phone: rawPhone || existing.phone,
                                    paid: isPaid || existing.paid
                                };
                            } else {
                                parsedNumbers[num] = {
                                    number: num,
                                    name: rawName,
                                    phone: rawPhone,
                                    paid: isPaid
                                };
                            }
                        });
                    });
                    
                    // Clean sizes up to nearest standard interval (e.g. 100, 200, 500, 1000) or keep max
                    let size = maxNumberParsed;
                    if (size <= 100) size = 100;
                    else if (size <= 200) size = 200;
                    else if (size <= 500) size = 500;
                    else if (size <= 1000) size = 1000;
                    else {
                        // Round up to nearest 100
                        size = Math.ceil(size / 100) * 100;
                    }
                    
                    // Create the full object of numbers
                    const finalNumbers = {};
                    for (let i = 1; i <= size; i++) {
                        finalNumbers[i] = parsedNumbers[i] || {
                            number: i,
                            name: '',
                            phone: '',
                            paid: false
                        };
                    }
                    
                    resolve({
                        size,
                        numbers: finalNumbers
                    });
                    
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    // Parse Word File using Mammoth
    parseWord(file) {
        return new Promise((resolve, reject) => {
            if (!window.mammoth) {
                reject(new Error("La librería de lectura de Word (Mammoth) no se ha cargado. Comprueba tu conexión a internet."));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                window.mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                    .then((result) => {
                        const text = result.value; // The raw text
                        const lines = text.split('\n');
                        
                        const parsedNumbers = {};
                        let maxNumberParsed = 100;
                        
                        // Parse each line looking for patterns like: "15: Juan Perez - 912345678 - pagado"
                        // Or "Nº 20 Carlos Perez"
                        lines.forEach((line) => {
                            const trimmed = line.trim();
                            if (trimmed === '') return;
                            
                            // Let's run a flexible extraction:
                            const numMatch = trimmed.match(/^(?:NUMERO|NÚMERO|Nº|N°|NRO|RIFA|TICKET|N|NO\.?)?\s*(\d+)[\s\.:,-]*/i);
                            if (!numMatch) return;
                            
                            const num = parseInt(numMatch[1], 10);
                            if (isNaN(num) || num <= 0 || num > 5000) return; // Skip invalid or extremely large numbers (safety cap)
                            
                            if (num > maxNumberParsed) {
                                maxNumberParsed = num;
                            }
                            
                            // Get rest of line after the number
                            const rest = trimmed.substring(numMatch[0].length).trim();
                            if (rest === '') return;
                            
                            const parts = rest.split(/[\-\|;]/).map(p => p.trim());
                            
                            let name = parts[0] || '';
                            let phone = '';
                            let paid = false;
                            
                            if (parts.length > 1) {
                                const phoneMatch = parts[1].replace(/\s+/g, '');
                                if (/^\+?\d{7,15}$/.test(phoneMatch)) {
                                    phone = parts[1];
                                } else {
                                    const partUpper = parts[1].toUpperCase();
                                    if (partUpper.includes("PAGADO") || partUpper.includes("EFECTIVO") || partUpper.includes("TRANSFERENCIA") || partUpper.includes("OK") || partUpper === "SI" || partUpper === "SÍ") {
                                        paid = true;
                                    } else {
                                        name += ' ' + parts[1];
                                    }
                                }
                            }
                            
                            if (parts.length > 2) {
                                const part2Upper = parts[2].toUpperCase();
                                if (part2Upper.includes("PAGADO") || part2Upper.includes("EFECTIVO") || part2Upper.includes("TRANSFERENCIA") || part2Upper.includes("OK") || part2Upper === "SI" || part2Upper === "SÍ") {
                                    paid = true;
                                } else if (phone === '') {
                                    phone = parts[2];
                                }
                            }
                            
                            if (name.toUpperCase().includes("(PAGADO)") || name.toUpperCase().includes("(OK)") || name.toUpperCase().includes("(PAGO)")) {
                                paid = true;
                                name = name.replace(/\([^\)]+\)/i, '').trim();
                            }
                            
                            parsedNumbers[num] = {
                                number: num,
                                name: name,
                                phone: phone,
                                paid: paid
                            };
                        });
                        
                        // Round up size
                        let size = maxNumberParsed;
                        if (size <= 100) size = 100;
                        else if (size <= 200) size = 200;
                        else if (size <= 500) size = 500;
                        else if (size <= 1000) size = 1000;
                        else size = Math.ceil(size / 100) * 100;
                        
                        const finalNumbers = {};
                        for (let i = 1; i <= size; i++) {
                            finalNumbers[i] = parsedNumbers[i] || {
                                number: i,
                                name: '',
                                phone: '',
                                paid: false
                            };
                        }
                        
                        resolve({
                            size,
                            numbers: finalNumbers
                        });
                    })
                    .catch(reject);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    }
};
