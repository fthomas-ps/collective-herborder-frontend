import {useState} from 'react';
import {useEffect} from 'react';
import {useParams} from "react-router-dom";
import humps from 'humps';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/system/Stack';
import { styled } from '@mui/system';
import Box from '@mui/system/Box';
import Grid from '@mui/system/Grid';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import './styles.css';

const Item = styled('div')(({ theme }) => ({
	width: '100%',
	height: '100%',
	backgroundColor: '#fff',
	padding: theme.spacing(1),
	borderRadius: '4px',
	textAlign: 'left',
	valign: 'bottom',
	...theme.applyStyles('dark', {
		backgroundColor: '#1A2027',
		borderColor: '#444d58',
	}),
}));

const StackItem = styled('div')(({ theme }) => ({
	backgroundColor: '#fff',
	textAlign: 'left',
	borderRadius: 4,
	...theme.applyStyles('dark', {
		backgroundColor: '#262B32',
	}),
}));

function Herb(herb, changeHerb, changeQuantity, availableHerbs, selectedHerbs, removeHerb,
		orderState) {
	return (
			<StackItem key={herb.key}>
				<Grid container>
					<Grid size={{ xs: 12, sm: 8 }}>
						<Item>
							<Autocomplete
									disablePortal
									options={availableHerbs?.filter(h => selectedHerbs.findIndex(sh => sh.herbId === h.id) < 0).map(h => h.name)}
									renderInput={(params) => <TextField {...params}
																											label="Kräuter"/>}
									value={herb.herbId === -1 ? "" : availableHerbs.find(h => h.id === herb.herbId).name}
									onChange={(event, newValue) => changeHerb(herb.key, newValue)}
									disabled={orderState !== 'placeOrder'}
							/>
						</Item>
					</Grid>
					<Grid size={{ xs: 10, sm: 3 }}>
						<Item>
							<TextField
									label="Anzahl"
									variant="outlined"
									type="number"
									sx={{ width: 1}}
									name={herb.key.toString()}
									disabled={orderState !== 'placeOrder'}
									value={herb.quantity}
									onChange={changeQuantity} />
						</Item>
					</Grid>
					<Grid size={{ xs: 2, sm: 1 }}>
						<Item sx={{ display: "flex", alignItems: "center" }}>
							<IconButton aria-label="delete" disabled={orderState !== 'placeOrder'} onClick={() => removeHerb(herb.key)}>
								<DeleteIcon />
							</IconButton>
						</Item>
					</Grid>
				</Grid>
			</StackItem>
	);
}

export default function HerbForm() {

	const {orderId} = useParams();

	const [order, setOrder] = useState(orderId === undefined ? {
		firstName: "",
		lastName: "",
		mail: "",
		herbs: [
				{key: 0, herbId: -1, quantity: ''},
				{key: 1, herbId: -1, quantity: ''},
				{key: 2, herbId: -1, quantity: ''},
				{key: 3, herbId: -1, quantity: ''},
				{key: 4, herbId: -1, quantity: ''}
		]} : null);

	const [ordersOpen, setOrdersOpen] = useState(false);
	const [orderBatch, setOrderBatch] = useState(null);

	// Supported values are loading, loading_technical_error, placeOrder, saveInProcess, saveSuccessful, closed
	const [orderState, setOrderState] = useState('loading');

	const [availableHerbs, setAvailableHerbs] = useState([]);

	const [message, setMessage] = useState(null);

	useEffect(() => initializeHerbOrder(), []);

	function initializeHerbOrder() {
		fetchOrderBatch()
		.then(batch => {
			fetchAvailableHerbs();
			return batch;
		})
		.then(batch => {
			if (orderId !== undefined) {
				fetchOrder(batch);
			} else {
				updateOrderState(batch);
			}
		});
	}

	function fetchOrderBatch() {
		const requestOptions = {
			method: 'GET',
			headers: {Accept: 'application/json,application/problem+json'}
		}
		return fetch(process.env.REACT_APP_BACKEND_URL + '/api/order_batches/abcde',
				requestOptions)
		.then(response => {
			if (response.status === 404) {
				throw Error("Order Batch " + orderId + " was not found");
			} else if (response.status !== 200) {
				throw Error(response.json().detail);
			} else {
				return response.json();
			}
		})
		.then(data => humps.camelizeKeys(data))
		.then(data => {
			setOrderBatch(data);
			return data;
		})
		.catch(error => {
			console.log("Error: " + error);
			setOrderState('loading_technical_error')
		});
	}

	function fetchAvailableHerbs() {
		const requestOptions = {
			method: 'GET',
			headers: {Accept: "application/json,application/problem+json"}
		};
		return fetch(process.env.REACT_APP_BACKEND_URL + '/api/herbs', requestOptions)
		.then(response => response.json())
		.then(data => humps.camelizeKeys(data))
		.then(data => setAvailableHerbs(data));
	}

	function updateOrderState(newOrderBatch) {
		if (newOrderBatch.orderState === 'CREATED') {
			setOrderState('notYetOpen')
		} else if (newOrderBatch.orderState !== 'ORDERS_OPEN') {
			setOrderState('closed')
		} else {
			setOrderState('placeOrder')
		}
	}

	function fetchOrder(newOrderBatch) {
		const requestOptions = {
			method: 'GET',
			headers: {Accept: 'application/json,application/problem+json'}
		}
		return fetch(process.env.REACT_APP_BACKEND_URL + '/api/orders/' + orderId,
				requestOptions)
		.then(response => {
			if (response.status === 404) {
				setOrderState("place_order");
				throw Error("Order " + orderId + " was not found");
			} else if (response.status !== 200) {
				setOrderState("loading_technical_error");
				throw Error(response.json().detail);
			} else {
				return response.json();
			}
		})
		.then(data => humps.camelizeKeys(data))
		.then(data => addHerbKeys(data))
		.then(data => setOrder(data))
		.then(() => updateOrderState(newOrderBatch))
		.catch(error => {
			console.log("Error: " + error);
		});
	}

	function addHerbKeys(order) {
		order.herbs.map((herb, index) => herb.key = index);
		return order;
	}

	function addHerb() {
		order.herbs = [...order.herbs, {
			key: Date.now(),
			herbId: -1,
			quantity: ''}];
		setOrder({...order});
	}

	function isEmpty(s) {
		return s === null || (typeof(s) === "string" && s.trim().length === 0);
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
			.filter(herb => herb.herbId < 0 || herb.quantity == null || isEmpty(herb.quantity) || herb.quantity <= 0);
		if (invalidHerbEntries.length > 0) {
			setMessage('Bitte kontrolliere deine Kräuter. In einzelnen Zeilen fehlen Kräuternamen oder die Anzahl!');
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

		setOrderState('saveInProcess');
		setMessage(<LinearProgress />);
		if (orderId === undefined) {
			saveNewOrder(orderForBackend);
		} else {
			updateExistingOrder(orderForBackend)
		}
	}

	function saveNewOrder(orderForBackend) {
		const requestOptions = {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(humps.decamelizeKeys(orderForBackend))
		};
		fetch(process.env.REACT_APP_BACKEND_URL + '/api/orders', requestOptions)
		.then(response => {
			if (response.status === 201) {
				return response.json();
			} else {
				throw Error();
			}
		})
		.then(json => {
			setOrderState('saveSuccessful');
			setMessage(<div><p>Die Bestellung wurde aufgenommen. Vielen Dank!</p>
				<p>Deine Bestellung kannst du jederzeit ändern. Gehe dazu einfach auf <a
						href={`https://meine-kraeuterbestellung.online/order/${json.external_id}`}>https://meine-kraeuterbestellung.online/order/{json.external_id}</a>.
				</p></div>);
		})
		.catch(error => {
					setMessage(<p>Beim Abschicken der Bestellung ist ein Fehler
						aufgetreten!</p>);
					setOrderState('placeOrder');
				}
		);
	}

	function updateExistingOrder(orderForBackend) {
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
			setOrderState('saveSuccessful');
			setMessage(<div><p>Die Bestellung wurde aktualisiert!</p><p>Deine Bestellung kannst du jederzeit ändern. Gehe dazu einfach auf <a href={`https://meine-kraeuterbestellung.online/order/${json.external_id}`}>https://meine-kraeuterbestellung.online/order/{json.external_id}</a>.</p></div>);
		})
		.catch(error => setMessage(<p>Beim Abschicken der Bestellung ist ein Fehler aufgetreten!</p>));
	}

	function onRemoveHerb(herbKey) {
		order.herbs = order.herbs.filter(
				(item) => item.key !== herbKey
		);
		setOrder({...order});
	}

	function findHerbByName(newValue) {
		if (newValue === null) {
			return -1;
		}
		return availableHerbs
				.find(herb => herb.name === newValue)
				.id;
	}

	function onChangeHerb(herbKey, newValue) {
		const newHerbId = findHerbByName(newValue);
		order.herbs
			.filter(h => h.key === herbKey)
			.forEach(h => h.herbId = newHerbId);
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

	if (order === null) {
		return (
				<Box sx={{width: {s: 1, sm: 600}}}>
					<Typography variant="h3" gutterBottom>Kräuterbestellung</Typography>
					{orderState === 'loading' && <LinearProgress/>}
					{orderState === 'loading_technical_error' && <p>Beim Laden der Kräuterbestellung ist ein Fehler aufgetreten! Bitte versuche es später noch einmal.</p>}
					{orderState !== 'loading' && orderState !== 'loading_technical_error' && <p>Die angegebene Kräuterbestellung wurde nicht gefunden!</p>}
				</Box>
		);
	}

	if (orderState === 'notYetOpen') {
		return (
				<Box sx={{width: {s: 1, sm: 600}}}>
					<Typography variant="h3" gutterBottom>{orderBatch.name}</Typography>
					<Box sx={{ marginTop: 3, marginBottom: 3, padding: 2, border: "1px solid rgb(192,192,192)", borderRadius: 3, backgroundColor: "rgb(255,255,255)" }}>
						<p>Die Kräuterbestellung wird demnächst geöffnet. Bitte habe noch etwas
						Geduld und schaue später noch einmal vorbei.</p>
					</Box>
				</Box>
		);
	}

	return (
			<Box sx={{width: {s: 1, sm: 600}}}>
				<Typography variant="h3" gutterBottom>{orderBatch.name}</Typography>
				{
					orderState === 'closed' &&
						<Box sx={{ marginTop: 3, marginBottom: 3, padding: 2, border: "1px solid rgb(192,192,192)", borderRadius: 3, backgroundColor: "rgb(255,255,255)" }}>
							<p>Die Kräuterbestellung ist abgeschlossen. Es kann keine neue Bestellung
							mehr aufgegeben und keine Bestellung mehr verändert werden.</p>
							<p>Bei Fragen zur Bestellung wende dich bitte an Shivam oder Amrut.</p>
						</Box>
				}
				<form>
					<Box sx={{ marginTop: 3, marginBottom: 3, padding: 2, border: "1px solid rgb(192,192,192)", borderRadius: 3, backgroundColor: "rgb(255,255,255)" }}>
						<Typography variant="h4" gutterBottom>Persönliche Informationen</Typography>
						<Stack spacing={2}>
							<StackItem>
								<TextField
										label="Vorname"
										variant="outlined"
										sx={{width: 1}}
										value={order.firstName}
										onChange={onChangeFirstName}
										disabled={orderState !== 'placeOrder'} />
							</StackItem>
							<StackItem>
								<TextField
										label="Nachname"
										variant="outlined"
										sx={{width: 1}}
										value={order.lastName}
										onChange={onChangeLastName}
										disabled={orderState !== 'placeOrder'} />
							</StackItem>
							<StackItem>
								<TextField
										label="E-Mail-Adresse"
										variant="outlined"
										sx={{width: 1}}
										value={order.mail}
										onChange={onChangeMail}
										disabled={orderState !== 'placeOrder'} />
							</StackItem>
						</Stack>
					</Box>
					<Box sx={{ marginTop: 3, marginBottom: 3, padding: 2, border: "1px solid rgb(192,192,192)", borderRadius: 3, backgroundColor: "rgb(255,255,255)" }}>
						<Typography variant="h4" gutterBottom>Kräuter</Typography>
						<Stack>
							{
								order.herbs.map((element, index) => Herb(element,
										onChangeHerb, onChangeQuantity, availableHerbs, order.herbs,
										onRemoveHerb, orderState))
							}
							<StackItem sx={{ paddingTop: 1 }}>
								<Button variant="contained" onClick={addHerb}
												disabled={orderState !== 'placeOrder'}
												startIcon={<AddIcon/>}>Hinzufügen</Button>
							</StackItem>
						</Stack>
					</Box>
					<Box sx={{ marginTop: 3, marginBottom: 3 }}>
						<Button variant="contained" onClick={saveHerb}
										disabled={orderState !== 'placeOrder'}>Bestellung Abschicken</Button>
					</Box>

					{message}
				</form>
			</Box>
	);
}
