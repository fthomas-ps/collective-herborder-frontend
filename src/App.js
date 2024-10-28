import {
	BrowserRouter as Router,
		Routes,
		Route
} from "react-router-dom";
import UnderConstruction from "./underConstruction";
import CreateOrder from "./createOrder";
import UpdateOrder from "./updateOrder";

export default function App() {

	return (
			<Router>
				  <Routes>
							<Route path="/" element={<UnderConstruction />}/>
							<Route path="/order" element={<CreateOrder />}/>
							<Route path="/order/:orderId" element={<UpdateOrder />}/>
					</Routes>
			</Router>
	)

}
