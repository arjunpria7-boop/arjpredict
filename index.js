/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

// IMPORTANT: This application reads the API_KEY from the environment.
// For deployment on Netlify, you MUST set an environment variable named API_KEY
// in your site's settings. You also need a build step to make this key
// available to the browser-side code.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This error will appear in the browser console if the API key isn't injected during a build step.
  throw new Error('API_KEY is not set. Configure it in your build environment.');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const predictButton = document.getElementById('predict-btn');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('results-container');
const errorContainer = document.getElementById('error-container');
const errorMessageElement = document.getElementById('error-message');
const marketSelect = document.getElementById('market-select');
const marketDate = document.getElementById('market-date');


const result2d = document.getElementById('result-2d');
const result3d = document.getElementById('result-3d');
const result4d = document.getElementById('result-4d');
const resultTunggal = document.getElementById('result-tunggal');
const resultBbfs = document.getElementById('result-bbfs');
const resultBb3d = document.getElementById('result-bb3d');
const resultBb2d = document.getElementById('result-bb2d');

const inputIds = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6'];
const inputElements = inputIds.map(
  (id) => document.getElementById(id)
);

async function handlePrediction() {
  // 1. UI Setup
  predictButton.disabled = true;
  predictButton.querySelector('.button-text').textContent = 'Mencari Angka Jitu...';
  resultsContainer.classList.add('hidden');
  errorContainer.classList.add('hidden');
  loader.classList.remove('hidden');

  try {
    // 2. Get and validate inputs
    const inputValues = inputElements.map((el) => el.value);
    if (inputValues.some((val) => !/^\d{4}$/.test(val))) {
      showError('Harap masukkan 4 digit angka untuk setiap hari.');
      return;
    }
    
    const marketNameText = marketSelect.value;
    const marketDateText = marketDate.textContent?.trim() || '';
    const marketText = `${marketNameText} ${marketDateText}`.trim();
    const formattedInputs = inputValues.map((val, i) => `Hari ${i+1}: ${val}`).join('\n');

    // 3. Construct Prompt
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
    
    // 4. Define Response Schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        prediction_2_digit: {
          type: Type.STRING,
          description: 'Prediksi 2 digit terakhir yang paling akurat (format: "XX").',
        },
        prediction_3_digit: {
          type: Type.STRING,
          description: 'Prediksi 3 digit terakhir (format: "XXX").',
        },
        prediction_4_digit: {
          type: Type.STRING,
          description: 'Prediksi 4 digit penuh (format: "XXXX").',
        },
        cb: {
          type: Type.STRING,
          description: 'Prediksi Colok Bebas (CB) yang paling jitu (1 digit).',
        },
        bbfs: {
          type: Type.STRING,
          description: 'Rekomendasi angka Bolak Balik Full Set (BBFS), 5-7 digit.',
        },
        bb_3d: {
          type: Type.STRING,
          description: 'Rekomendasi 4 angka Bolak Balik untuk 3D (BB 3D), dipisahkan oleh tanda *. Contoh: "123*456*789*012".',
        },
        bb_2d: {
          type: Type.STRING,
          description: 'Rekomendasi 6 angka Bolak Balik untuk 2D (BB 2D), dipisahkan oleh tanda *. Contoh: "12*34*56*78*90*11".',
        },
      },
      required: ['prediction_2_digit', 'prediction_3_digit', 'prediction_4_digit', 'cb', 'bbfs', 'bb_3d', 'bb_2d']
    };

    // 5. Call Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    // 6. Process and Display Response
    const responseText = response.text;
    if (!responseText || responseText.trim() === '') {
      showError('Permintaan Anda mungkin diblokir karena kebijakan keamanan. Coba ubah input Anda.');
      return;
    }

    let resultJson;
    try {
      resultJson = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', responseText);
      showError('Sistem ARJ memberikan respons yang tidak valid. Silakan coba lagi.');
      return;
    }

    result2d.textContent = resultJson.prediction_2_digit;
    result3d.textContent = resultJson.prediction_3_digit;
    result4d.textContent = resultJson.prediction_4_digit;
    
    resultTunggal.textContent = resultJson.cb;
    resultBbfs.textContent = resultJson.bbfs;
    resultBb3d.textContent = resultJson.bb_3d;
    resultBb2d.textContent = resultJson.bb_2d;

    resultsContainer.classList.remove('hidden');

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    let userMessage = 'Terjadi kesalahan saat menghubungi sistem ARJ. Silakan coba lagi.';

    if (error instanceof Error) {
        if (error.message.toLowerCase().includes('fetch')) {
            userMessage = 'Gagal terhubung ke sistem ARJ. Periksa koneksi internet Anda.';
        } else if (error.message.includes('429')) { // Quota limit
            userMessage = 'Sistem ARJ sedang sibuk. Silakan coba lagi setelah beberapa saat.';
        } else if (error.message.includes('API key not valid')) {
            userMessage = 'Terjadi masalah konfigurasi pada sistem. Silakan hubungi administrator.';
        }
    }
    showError(userMessage);

  } finally {
    // 7. Reset UI
    loader.classList.add('hidden');
    resetButton();
  }
}

function showError(message) {
  errorMessageElement.textContent = message;
  errorContainer.classList.remove('hidden');
  loader.classList.add('hidden'); // Ensure loader is hidden on error
}

function resetButton() {
  predictButton.disabled = false;
  predictButton.querySelector('.button-text').textContent = 'Prediksi Angka Jitu';
}


predictButton.addEventListener('click', handlePrediction);