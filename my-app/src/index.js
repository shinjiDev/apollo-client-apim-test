import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client';
import { split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { useSubscription, useMutation } from '@apollo/react-hooks'
import reportWebVitals from './reportWebVitals';


const httpLink = new HttpLink({
  uri: 'https://proxy.apim.net/syntheticpets'
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'wss://proxy.apim.net/syntheticpets',
  options: {
    reconnect: true
  }
}));

// The split function takes three parameters:
//
// * A function that's called for each operation to execute
// * The Link to use for an operation if the function returns a "truthy" value
// * The Link to use for an operation if the function returns a "falsy" value
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});

const FAMILIES_QUERY = gql`
    query {
      allFamilies {
        id
        name
      }
    }
`;

const FAMILIES_SUBSCRIPTION = gql`
subscription {
	onFamilyCreated {
		id
		name
	}
}
`;

const FAMILY_CREATE = gql`
mutation CreateFamily($id: Int!, $name: String!){
	createFamily(id: $id, name: $name) {
		name
	}
}
`;

function Families({ onDogSelected }) {
  const { loading, error, data } = useQuery(FAMILIES_QUERY, {
    variables: null,
  });

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <select name='family' onChange={onDogSelected}>
      {data.allFamilies.map((family) => (
        <option key={family.id} value={family.name}>
          {family.name}
        </option>
      ))}
    </select>
  );
}

function LastFamily() {
  const { loading, error, data } = useSubscription(FAMILIES_SUBSCRIPTION, {
    variables: { },
    onData: data => console.log('new data', data)
  });

  if (loading) return <div>Loading...</div>;
  if (error) {
    console.log(error);
    return <div>Error!</div>;
  }
  console.log(data);
  const family = data.onFamilyCreated;
  console.log(family);
  return (
    <div>
      <h1>{family.name}</h1>
    </div>
  );
}

function FamilyCreate() {
  let id;
  let family;
  const [addTodo, { data, loading, error }] = useMutation(FAMILY_CREATE);

  if (loading) return 'Submitting...';
  if (error) return `Submission error! ${error.message}`;

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault();
          addTodo({ variables: { id: parseInt(id.value), name: family.value } });
          id.value = 1;
          family.value = '';
        }}
      >
        <input
          ref={node1 => {
            console.log(node1);
            id = node1;
          }}
        />

        <input
          ref={node2 => {
            console.log(node2);
            family = node2;
          }}
        />
        <button type="submit">Add Family</button>
      </form>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  (<ApolloProvider client={client}>
   <div>
   <Families />
   <LastFamily />
   <FamilyCreate />
    </div>
  </ApolloProvider>));

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();