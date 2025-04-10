import ReactDOM from 'react-dom/client';
import MyComponent from './$$$componentName$$$';


  
const App = () => {
	return <MyComponent />
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
    <App />
);