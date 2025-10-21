/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { API_KEY } from './env.js';

// --- DOM Elements ---
const predictButton = document.getElementById('predict-btn');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('results-container');
const errorContainer = document.getElementById('error-container');
const errorMessageElement = document.getElementById('error-message');
const marketSelect = document.getElementById('market-select');
const marketDate = document.getElementById('market-date');

const resultElements = {
  '2d': document.getElementById('result-2d'),
  '3d': document.getElementById('result-3d'),
  '4d': document.getElementById('result-4d'),
  tunggal: document.getElementById('result-tunggal'),
  bbfs: document.getElementById('result-bbfs'),
  bb3d: document.getElementById('result-bb3d'),
  bb2d: document.getElementById('result-bb2d'),
};

const inputIds = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6'];
const inputElements = inputIds.map(
  (id) => document.getElementById(id)
);

// --- UI State Management ---

function setIdleState() {
  predictButton.disabled = false;
  predictButton.querySelector('.button-text').textContent = 'Prediksi Angka Jitu';
  loader.classList.add('hidden');
  errorContainer.classList.add('hidden');
}

function setLoadingState() {
  predictButton.disabled = true;
  predictButton.querySelector('.button-text').textContent = 'Mencari Angka Jitu...';
  loader.classList.remove('hidden');
  errorContainer.classList.add('hidden');
  
  // Show results container with "analyzing" text
  resultsContainer.classList.remove('hidden');
  Object.values(resultElements).forEach(el => {
    el.parentElement.classList.add('analyzing');
    el.textContent = 'Menganalisis...';
  });
}

function setSuccessState(resultJson) {
  loader.classList.add('hidden');
  
  Object.values(resultElements).forEach(el => {
    el.parentElement.classList.remove('analyzing');
  });

  resultElements['2d'].textContent = resultJson.prediction_2_digit;
  resultElements['3d'].textContent = resultJson.prediction_3_digit;
  resultElements['4d'].textContent = resultJson.prediction_4_digit;
  resultElements.tunggal.textContent = resultJson.cb;
  resultElements.bbfs.textContent = resultJson.bbfs;
  resultElements.bb3d.textContent = resultJson.bb_3d;
  resultElements.bb2d.textContent = resultJson.bb_2d;

  setIdleState();
}

function setErrorState(message) {
  loader.classList.add('hidden');
  resultsContainer.classList.add('hidden');
  errorMessageElement.textContent = message;
  errorContainer.classList.remove('hidden');
  setIdleState();
}

function showConfigurationError() {
  const allInputsAndButtons = document.querySelectorAll('input, select, button');
  allInputsAndButtons.forEach(el => {
    if (el) el.disabled = true;
  });
  
  resultsContainer.classList.add('hidden');
  loader.classList.add('hidden');

  errorMessageElement.innerHTML = `<strong>Konfigurasi Dibutuhkan:</strong> API Key tidak ditemukan. Buka file <strong>env.js</strong> di dalam folder proyek ini dan masukkan API Key Anda di sana.`;
  errorContainer.classList.remove('hidden');

  if(predictButton) {
    predictButton.querySelector('.button-text').textContent = 'Butuh API Key';
    predictButton.style.background = '#555';
    predictButton.style.animation = 'none';
    predictButton.style.cursor = 'not-allowed';
  }
}

// --- Main Prediction Logic ---

async function handlePrediction(ai) {
  // 1. Validate inputs
  let allValid = true;
  const inputValues = [];
  inputElements.forEach((el) => {
    const value = el.value;
    if (!/^\d{4}$/.test(value)) {
      el.classList.add('invalid');
      allValid = false;
    } else {
      el.classList.remove('invalid');
      inputValues.push(value);
    }
  });

  if (!allValid) {
    setErrorState('Harap perbaiki input yang ditandai merah. Setiap input harus berisi 4 digit angka.');
    // Keep results hidden if there was an error
    resultsContainer.classList.add('hidden');
    return;
  }
  
  setLoadingState();

  try {
    // 2. Construct Prompt
    const marketNameText = marketSelect.value;
    const marketDateText = marketDate.value?.trim() || '';
    const marketText = `${marketNameText} ${marketDateText}`.trim();
    const formattedInputs = inputValues.map((val, i) => `Hari ${i+1}: ${val}`).join('\n');

    const prompt = `
      Anda adalah sistem prediksi ARJ, seorang master prediksi togel dengan spesialisasi utama pada 2D (dua digit terakhir).
      Tugas Anda adalah menganalisis 6 angka keluaran terakhir untuk pasaran **${marketText}** dengan **fokus utama untuk menemukan prediksi 2D yang paling jitu dan akurat** untuk keluaran berikutnya (Hari ke-7).
      Gunakan semua keahlian Anda, termasuk perhitungan matematis, analisis pola frekuensi, pola mistis, dan numerologi, namun **prioritaskan metode yang paling efektif untuk memprediksi 2D**.

      Berikut adalah urutan angkanya:
      ${formattedInputs}

      Meskipun fokus utama Anda adalah 2D, berikan juga prediksi lainnya sebagai pelengkap.
      Berdasarkan analisis mendalam Anda (terutama untuk 2D), berikan:
      1. Prediksi 2D yang paling jitu (2 digit terakhir) untuk Hari 7.
      2. Prediksi untuk 3 digit terakhir (3D) untuk Hari 7, yang selaras dengan prediksi 2D Anda.
      3. Prediksi untuk angka 4 digit penuh (4D) untuk Hari 7, yang selaras dengan prediksi 2D Anda.
      4. Prediksi Colok Bebas (CB) yang paling jitu (1 digit).
      5. Rekomendasi angka Bolak Balik Full Set (BBFS), biasanya 5-7 digit.
      6. Rekomendasi angka Bolak Balik untuk 3D (BB 3D), berikan 4 angka (masing-masing 3 digit) yang dipisahkan oleh tanda '*'.
      7. Rekomendasi angka Bolak Balik untuk 2D (BB 2D), berikan 6 angka (masing-masing 2 digit) yang dipisahkan oleh tanda '*'.


      Berikan jawaban Anda dalam format JSON yang ketat.
    `;
    
    // 3. Define Response Schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        prediction_2_digit: { type: Type.STRING, description: 'Prediksi 2 digit terakhir yang paling akurat (format: "XX").' },
        prediction_3_digit: { type: Type.STRING, description: 'Prediksi 3 digit terakhir (format: "XXX").' },
        prediction_4_digit: { type: Type.STRING, description: 'Prediksi 4 digit penuh (format: "XXXX").' },
        cb: { type: Type.STRING, description: 'Prediksi Colok Bebas (CB) yang paling jitu (1 digit).' },
        bbfs: { type: Type.STRING, description: 'Rekomendasi angka Bolak Balik Full Set (BBFS), 5-7 digit.' },
        bb_3d: { type: Type.STRING, description: 'Rekomendasi 4 angka Bolak Balik untuk 3D (BB 3D), dipisahkan oleh tanda *. Contoh: "123*456*789*012".' },
        bb_2d: { type: Type.STRING, description: 'Rekomendasi 6 angka Bolak Balik untuk 2D (BB 2D), dipisahkan oleh tanda *. Contoh: "12*34*56*78*90*11".' },
      },
      required: ['prediction_2_digit', 'prediction_3_digit', 'prediction_4_digit', 'cb', 'bbfs', 'bb_3d', 'bb_2d']
    };

    // 4. Call Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    // 5. Process and Display Response
    const responseText = response.text;
    if (!responseText || responseText.trim() === '') {
      setErrorState('Permintaan Anda mungkin diblokir karena kebijakan keamanan. Coba ubah input Anda.');
      return;
    }

    let resultJson;
    try {
      resultJson = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', responseText);
      setErrorState('Sistem ARJ memberikan respons yang tidak valid. Silakan coba lagi.');
      return;
    }

    setSuccessState(resultJson);

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    let userMessage = 'Terjadi kesalahan saat menghubungi sistem ARJ. Silakan coba lagi.';
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes('fetch')) {
            userMessage = 'Gagal terhubung ke sistem ARJ. Periksa koneksi internet Anda.';
        } else if (error.message.includes('429')) { // Quota limit
            userMessage = 'Sistem ARJ sedang sibuk. Silakan coba lagi setelah beberapa saat.';
        } else if (error.message.toLowerCase().includes('api key not valid')) {
            userMessage = 'API Key yang Anda masukkan tidak valid. Periksa kembali file env.js.';
        }
    }
    setErrorState(userMessage);
  }
}

// --- App Initialization ---

function main() {
  if (!API_KEY || API_KEY === "MASUKKAN_API_KEY_ANDA_DI_SINI") {
    showConfigurationError();
    return;
  }
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  predictButton.addEventListener('click', () => handlePrediction(ai));

  // Add real-time validation listeners
  inputElements.forEach(input => {
    input.addEventListener('input', () => {
      if (!/^\d{4}$/.test(input.value) && input.value !== '') {
        input.classList.add('invalid');
      } else {
        input.classList.remove('invalid');
      }
    });
  });

  setIdleState();
}

main();
