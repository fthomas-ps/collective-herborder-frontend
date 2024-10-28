import {useState, useEffect, useRef} from 'react';
import {useParams} from "react-router-dom";
import humps from 'humps';
import './styles.css'

function HerbOption(herb, index) {
  return (
      <option key={herb.id} value={herb.id}>{herb.name}</option>
  );
}

function Herb(herb, changeHerb, changeQuantity, availableHerbs, removeHerb,
    orderSuccess) {
  return (
      <div key={herb.key} className="board-row">
        <select id="dropdown" name={herb.key} value={herb.herbId}
                onChange={changeHerb} className="column"
                disabled={orderSuccess}>
          {
            availableHerbs?.map(
                (availableHerb, index) => HerbOption(availableHerb, index))
          }
        </select>
        <input type="text" name={herb.key} value={herb.quantity}
               onChange={changeQuantity} className="column"
               disabled={orderSuccess}/>
        <button type="button" name={herb.key} onClick={removeHerb}
                disabled={orderSuccess}>Entfernen
        </button>
      </div>
  );
}

export default function HerbForm() {

  let {orderId} = useParams();

  const [order, setOrder] = useState(null);

  const [orderSuccess, setOrderSuccess] = useState(false);

  const [availableHerbs, setAvailableHerbs] = useState(
      () => fetchAvailableHerbs());

  const [message, setMessage] = useState(null);

  useEffect(() => fetchOrder(), []);

  useEffect(() => fetchAvailableHerbs(), []);

  function fetchOrder() {
    const requestOptions = {
      method: 'GET',
			headers: {Accept: 'application/json,application/problem+json'}
    }
    fetch(process.env.REACT_APP_BACKEND_URL + '/api/orders/' + orderId,
        requestOptions)
      .then(response => {
        if (response.status !== 200) {
          throw Error(response.json().detail);
        } else {
          return response.json();
        }
      })
      .then(data => humps.camelizeKeys(data))
      .then(data => addHerbKeys(data))
      .then(data => setOrder(data))
      .catch(error => console.log("Error: " + error));
  }

  function addHerbKeys(order) {
    order.herbs.map((herb, index) => herb.key = index);
    return order;
  }

  function fetchAvailableHerbs() {
    const requestOptions = {
      method: 'GET'
    };
    fetch(process.env.REACT_APP_BACKEND_URL + '/api/herbs', requestOptions)
    .then(response => response.json())
    .then(data => humps.camelizeKeys(data))
    .then(data => setAvailableHerbs(
        [{id: -1, name: '---Bitte wählen---'},
          ...data
        ]));
  }

  function addHerb() {
    order.herbs = [...order.herbs, {
      key: Date.now(),
      herbId: -1,
      quantity: ''
    }];
    setOrder({...order});
  }

  function isEmpty(s) {
    return s === null || (typeof (s) === "string" && s.trim().length === 0);
  }

  function cleanupOrderForBackend() {
    const orderForBackend = {...order}
    orderForBackend.herbs = orderForBackend.herbs
    .filter(herb => herb.herbId > 0 || herb.quantity > 0)
    .map(herb => {
      const {key, ...newHerb} = herb;
      return newHerb;
    });
    return orderForBackend;
  }
  function saveHerb() {
    const orderForBackend = cleanupOrderForBackend();
    if (isEmpty(order.firstName)) {
      setMessage('Bitte gib deinen Vornamen ein!');
      return;
    }
    if (isEmpty(order.lastName)) {
      setMessage('Bitte gib deinen Nachnamen ein!');
      return;
    }
    if (isEmpty(order.mail)) {
      setMessage('Bitte gib deine E-Mail-Adresse ein!');
      return;
    }
    if (orderForBackend.herbs.length === 0) {
      setMessage('Bitte füge Kräuter hinzu!');
      return;
    }
    const invalidHerbEntries = orderForBackend.herbs
    .filter(herb => herb.herbId < 0 || herb.quantity == null || isEmpty(
        herb.quantity));
    if (invalidHerbEntries.length > 0) {
      setMessage(
          'Bitte kontrolliere deine Kräuter. In einzelnen Zeilen fehlen Kräuternamen oder die Anzahl!');
      return;
    }
    const itemsGroupedByHerbs = Object.groupBy(
        orderForBackend.herbs,
        herb => herb.herbId
    );
    const numberDuplicateEntries = Object.keys(itemsGroupedByHerbs)
    .filter(key => itemsGroupedByHerbs[key].length > 1)
        .length;
    if (numberDuplicateEntries > 0) {
      setMessage('Bitte entferne die doppelten Kräuter!');
      return;
    }
    const requestOptions = {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', Accept: 'application/json,application/problem+json'},
      body: JSON.stringify(humps.decamelizeKeys(orderForBackend))
    };
    fetch(process.env.REACT_APP_BACKEND_URL + '/api/orders/' + orderId,
        requestOptions)
      .then(response => {
        if (response.status === 200) {
          return response.json();
        } else {
          throw Error();
        }
      })
      .then(json => {
        setOrderSuccess(true);
        setMessage(<div><p>Die Bestellung wurde aktualisiert!</p><p>Deine Bestellung kannst du jederzeit ändern. Gehe dazu einfach auf <a href={`https://meine-kraeuterbestellung.online/order/${json.external_id}`}>https://meine-kraeuterbestellung.online/order/{json.external_id}</a>.</p></div>);
      })
    .catch(error => setMessage(<p>Beim Abschicken der Bestellung ist ein Fehler aufgetreten!</p>)
  );
  }

  function onRemoveHerb(event) {
    order.herbs = order.herbs.filter(
        (item) => item.key.toString() !== event.target.name
    );
    setOrder({...order});
  }

  function onChangeHerb(event) {
    order.herbs
    .filter(herb => herb.key.toString() === event.target.name)
    .forEach(herb => {
      herb.herbId = event.target.value
    });
    setOrder({...order});
  }

  function onChangeQuantity(event) {
    order.herbs
    .filter(herb => herb.key.toString() === event.target.name)
    .forEach(herb => herb.quantity = event.target.value);
    setOrder({...order})
  }

  function onChangeFirstName(event) {
    order['firstName'] = event.target.value;
    setOrder({...order});
  }

  function onChangeLastName(event) {
    order['lastName'] = event.target.value;
    setOrder({...order});
  }

  function onChangeMail(event) {
    order['mail'] = event.target.value;
    setOrder({...order});
  }

  if (order == null) {
    return (
        <div>
            <h1>Kräuterbestellung 2025</h1>
						<p>Die angegebene Kräuterbestellung wurde nicht gefunden!</p>
        </div>
    );
  }

  return (
      <div>
        <h1>Kräuterbestellung 2025</h1>
        <form>
          <div className="form-paragraph">
            <div className="board-row">
              <label className="column">Vorname:</label>
              <input type="text" onChange={onChangeFirstName}
                     className="wide-column" disabled={orderSuccess}
                     value={order.firstName}></input>
            </div>
            <div className="board-row">
              <label className="column">Nachname:</label>
              <input type="text" onChange={onChangeLastName}
                     className="wide-column" disabled={orderSuccess}
                     value={order.lastName}></input>
            </div>
            <div className="board-row">
              <label className="column">E-Mail-Adresse:</label>
              <input type="text" id="mail-input" onChange={onChangeMail}
                     className="wide-column" disabled={orderSuccess}
                     value={order.mail}></input>
            </div>
          </div>
          <div className="board-row">
            <label className="column">Kräuter</label>
            <label className="column">Anzahl</label>
          </div>
          <div className="form-paragraph">
            {
              order.herbs.map((element, index) => Herb(element,
                  onChangeHerb, onChangeQuantity, availableHerbs,
                  onRemoveHerb,
                  orderSuccess))
            }
            <div className="form-paragraph">
              <button type="button" onClick={addHerb}
                      disabled={orderSuccess}>Hinzufügen
              </button>
            </div>
          </div>
          <div className="form-paragraph">
            <button type="button" onClick={saveHerb}
                    disabled={orderSuccess}>Abschicken
            </button>
          </div>

          {message}
        </form>
      </div>
  );
}
