import {useState} from 'react';
import {useEffect} from 'react';
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
import './styles.css';

const Item = styled('div')(({ theme }) => ({
	width: '100%',
	height: '100%',
	backgroundColor: '#fff',
	//border: '1px solid',
	//borderColor: '#ced7e0',
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
	//padding: theme.spacing(1),
	textAlign: 'left',
	borderRadius: 4,
	...theme.applyStyles('dark', {
		backgroundColor: '#262B32',
	}),
}));

function Herb(herb, changeHerb, changeQuantity, availableHerbs, selectedHerbs, removeHerb,
		orderSuccess) {
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
									onChange={(event, newValue) => changeHerb(herb.key, newValue)}
									disabled={orderSuccess}
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
									disabled={orderSuccess}
									onChange={changeQuantity} />
						</Item>
					</Grid>
					<Grid size={{ xs: 2, sm: 1 }}>
						<Item sx={{ display: "flex", alignItems: "center" }}>
							<IconButton aria-label="delete" disabled={orderSuccess} onClick={() => removeHerb(herb.key)}>
								<DeleteIcon />
							</IconButton>
						</Item>
					</Grid>
				</Grid>
			</StackItem>
	);
}

export default function HerbForm() {

	const [order, setOrder] = useState({
		firstName: null,
		lastName: null,
		mail: null,
		herbs: [
				{key: 0, herbId: -1, quantity: ''},
				{key: 1, herbId: -1, quantity: ''},
				{key: 2, herbId: -1, quantity: ''},
				{key: 3, herbId: -1, quantity: ''},
				{key: 4, herbId: -1, quantity: ''}
		]});

	const [orderSuccess, setOrderSuccess] = useState(false);

	const [availableHerbs, setAvailableHerbs] = useState([]);

	const [message, setMessage] = useState(null);

	useEffect(() => fetchAvailableHerbs(), []);

	function fetchAvailableHerbs() {
		const requestOptions = {
			method: 'GET'
		};
		fetch(process.env.REACT_APP_BACKEND_URL + '/api/herbs', requestOptions)
			.then(response => response.json())
			.then(data => humps.camelizeKeys(data))
			.then(data => setAvailableHerbs(data));
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
				setOrderSuccess(true);
				setMessage(<div><p>Die Bestellung wurde aufgenommen. Vielen Dank!</p>
					<p>Deine Bestellung kannst du jederzeit ändern. Gehe dazu einfach auf <a
							href={`https://meine-kraeuterbestellung.online/order/${json.external_id}`}>https://meine-kraeuterbestellung.online/order/{json.external_id}</a>.
					</p></div>);
			})
			.catch(error => setMessage(<p>Beim Abschicken der Bestellung ist ein Fehler
				aufgetreten!</p>)
			);
	}
	
	function onRemoveHerb(herbKey) {
		order.herbs = order.herbs.filter(
				(item) => item.key !== herbKey
		);
		setOrder({...order});
	}

	function onChangeHerb(herbKey, newValue) {
		const herb = availableHerbs
			.find(herb => herb.name === newValue);
		order.herbs
			.filter(h => h.key === herbKey)
			.forEach(h => h.herbId = herb.id);
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
	}

	function onChangeLastName(event) {
		order['lastName'] = event.target.value;
	}

	function onChangeMail(event) {
		order['mail'] = event.target.value;
	}

	return (
			<Box>
				<Typography variant="h2" gutterBottom>Kräuterbestellung 2025</Typography>
				<form>
					<Box sx={{ width: {s: 1, sm: 600}, marginTop: 3, marginBottom: 3, padding: 2, border: "1px solid rgb(192,192,192)", borderRadius: 3, backgroundColor: "rgb(255,255,255)" }}>
						<Typography variant="h4" gutterBottom>Persönliche Informationen</Typography>
						<Stack spacing={2}>
							<StackItem>
								<TextField label="Vorname" variant="outlined" sx={{width: 1}} onChange={onChangeFirstName} disabled={orderSuccess} />
							</StackItem>
							<StackItem>
								<TextField label="Nachname" variant="outlined" sx={{width: 1}} onChange={onChangeLastName} disabled={orderSuccess} />
							</StackItem>
							<StackItem>
								<TextField label="E-Mail-Adresse" variant="outlined"
													 sx={{width: 1}} onChange={onChangeMail} disabled={orderSuccess} />
							</StackItem>
						</Stack>
					</Box>
					<Box sx={{ width: {s: 1, sm: 600}, marginTop: 3, marginBottom: 3, padding: 2, border: "1px solid rgb(192,192,192)", borderRadius: 3, backgroundColor: "rgb(255,255,255)" }}>
						<Typography variant="h4" gutterBottom>Kräuter</Typography>
						<Stack>
							{
								order.herbs.map((element, index) => Herb(element,
										onChangeHerb, onChangeQuantity, availableHerbs, order.herbs,
										onRemoveHerb, orderSuccess))
							}
							<StackItem sx={{ paddingTop: 1 }}>
								<Button variant="contained" onClick={addHerb}
												disabled={orderSuccess}
												startIcon={<AddIcon/>}>Hinzufügen</Button>
							</StackItem>
						</Stack>
					</Box>
					<Box sx={{width: {s: 1, sm: 600}, marginTop: 3, marginBottom: 3}}>
						<Button variant="contained" onClick={saveHerb}
										disabled={orderSuccess}>Bestellung Abschicken</Button>
					</Box>

					{message}
				</form>
			</Box>
	);
}
