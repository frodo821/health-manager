const DB_NAME = "savedHealthData";
const OBJ_STORE_NAME = "healthData"

window.addEventListener('DOMContentLoaded', () =>{
  const error = document.getElementById('error');
  const checkboxes = [
    document.getElementById('checkbox-1'),
    document.getElementById('checkbox-2'),
    document.getElementById('checkbox-3'),
    document.getElementById('checkbox-4'),
    document.getElementById('checkbox-5'),
    document.getElementById('checkbox-6'),
    document.getElementById('checkbox-7'),
    document.getElementById('checkbox-8'),
    document.getElementById('checkbox-9'),
  ];
  const date = document.getElementById('date-1');
  const dayOfWeek = document.getElementById('day-of-week');
  const form = document.getElementById('form-1');
  const remarks = document.getElementById('remarks');
  const table = document.getElementById('table-1');

  /**
   * @type {IDBDatabase}
   */
  let database = undefined;
  let updater = undefined;

  if (!window.indexedDB) {
    error.innerHTML = '<p>このブラウザは動作に必要な機能をサポートしていません。</p>';
    return;
  }

  const dbReq = window.indexedDB.open(DB_NAME, 1);

  dbReq.onerror = () => {
    error.innerHTML = `<p>不明なエラーが発生しました: ${dbReq.error.message}</p>`;
  }

  dbReq.onsuccess = (evt) => {
    database = evt.target.result;
    updater = tableUpdaterFactory(database);

    updater(table);
  }

  dbReq.onupgradeneeded = (evt) => {
    database = evt.target.result;
    const store = database.createObjectStore(OBJ_STORE_NAME, { autoIncrement: true, keyPath: 'id' });
    store.createIndex('date', 'date', { unique: false });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }

  checkboxes.slice(3).forEach(it => {
    it.addEventListener('change', () => {
      const all_checked = checkboxes.slice(3).every(it => it.checked);
      const any_checked = checkboxes.slice(3).some(it => it.checked);
      checkboxes[2].setAttribute('data-indeterminate', any_checked && !all_checked ? 'true' : void 0);
      checkboxes[2].checked = all_checked;
    });
  });

  checkboxes[2].addEventListener('change', () => {
    const all_checked = checkboxes.slice(3).every(it => it.checked);
    const any_checked = checkboxes.slice(3).some(it => it.checked);

    if (any_checked && !all_checked) {
      checkboxes[2].setAttribute('data-indeterminate', void 0);
    }

    checkboxes[2].checked = !any_checked;

    checkboxes.slice(3).forEach(it => {
      it.checked = checkboxes[2].checked;
    });
  });

  const now = new Date();

  date.value = `${
    now.getFullYear().toString().padStart(4, '0')
  }-${
    (now.getMonth() + 1).toString().padStart(2, '0')
  }-${
    now.getDate().toString().padStart(2, '0')
  }`;

  const updateDayOfWeek = () => {
    dayOfWeek.innerText = `(${getDayOfWeek(date.value)})`;
  };

  date.addEventListener('change', updateDayOfWeek);
  updateDayOfWeek();

  form.addEventListener('submit', (evt) => {
    evt.preventDefault();

    const data = {
      date: date.value,
      morning: checkboxes[0].checked,
      evening: checkboxes[1].checked,
      cold: checkboxes.slice(3).some(it => it.checked),
      cough: checkboxes[3].checked,
      runny_nose: checkboxes[4].checked,
      sneeze: checkboxes[5].checked,
      sore_throat: checkboxes[6].checked,
      malaise: checkboxes[7].checked,
      dyspnea: checkboxes[8].checked,
      remarks: remarks.value
    }

    const store = database.transaction([OBJ_STORE_NAME], "readwrite").objectStore(OBJ_STORE_NAME);
    const req = store.index('date').get(data.date);

    req.onsuccess = (ev) => {
      if (typeof ev.target.result === 'undefined') {
        console.log("add new row");
        store.add(data).onsuccess = () => updater(table);
        return;
      }
      data.id = ev.target.result.id;
      store.put(data).onsuccess = () => updater(table);
    };
  });

  error.remove();
});


function getDayOfWeek(date) {
  const d = new Date(date);
  return ['日', '月','火','水','木','金','土'][d.getDay()]
}

/**
 * 
 * @param {IDBDatabase} database 
 */
function tableUpdaterFactory(database) {
  /**
   * 
   * @param {HTMLTableElement} table 
   */
  function updateTable(table) {
    const objectStore = database.transaction([OBJ_STORE_NAME], 'readonly').objectStore(OBJ_STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = (ev) => {
      /**
       * @type {Array}
       */
      const results = ev.target.result.sort((a,b) => (new Date(a.date)) - (new Date(b.date)));

      table.innerHTML = "<tr><th>日付</th><th>曜日</th><th>朝の発熱</th><th>夕方の発熱</th><th>風邪症状</th><th>備考</th></tr>"

      results.forEach(({ date, morning, evening, cold, cough, runny_nose, sneeze, sore_throat, malaise, dyspnea, remarks}) => {
        const row = document.createElement('tr');

        row.innerHTML = `<td>${
          date
        }</td><td>${
          getDayOfWeek(date)
        }</td><td>${
          morning ? '発熱あり' : '発熱なし'
        }</td><td>${
          evening ? '発熱あり' : '発熱なし'
        }</td><td>${
          cold ? [
            cough ? ['咳'] : [],
            runny_nose ? ['鼻水'] : [],
            sneeze ? ['くしゃみ'] : [],
            sore_throat ? ['咽喉痛'] : [],
            malaise ? ['倦怠感'] : [],
            dyspnea ? ['呼吸困難感'] : [],
          ].flat().join('・') : '風邪症状なし'
        }</td><td>${
          remarks || '備考なし'
        }</td>`;

        table.appendChild(row);
      });
    };
  }

  return updateTable;
}